import crypto from 'crypto';

import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';
import { expectParity, makeRequest, normalise } from '../helpers/parity';

/**
 * Native payment / refund Route Handlers vs the Express adapter.
 *
 * These move real money, so the cases below are weighted towards the things
 * that would be expensive to get wrong: webhook signature verification over the
 * exact raw bytes, the order in which the webhook's checks run, and the
 * admin-only gates on approve / reject / retry.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

/** A body that satisfies the webhook schema. */
const validWebhookBody = {
	event: 'payment.captured',
	payload: { payment: { entity: { id: 'pay_test123', order_id: 'order_test123' } } },
};

function sign(raw: string, secret: string): string {
	return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

describe('payment & refund — native vs Express parity', () => {
	jest.setTimeout(120_000);

	beforeAll(async () => {
		process.env.DATABASE_URL = await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	// ---- webhook -------------------------------------------------------------

	it('webhook — a malformed body is rejected before any signature work', async () => {
		const { POST } = await import('@/app/api/payment/webhook/route');
		const result = await expectParity(
			'/api/payment/webhook',
			{ json: { nonsense: true } },
			POST
		);

		// Shape is checked first, matching the Express middleware order — so this
		// is a 400 about the body, not about a missing signature header.
		expect(result.status).toBe(400);
	});

	it('webhook — a well-formed body with no signature header is rejected', async () => {
		const { POST } = await import('@/app/api/payment/webhook/route');
		const result = await expectParity(
			'/api/payment/webhook',
			{ json: validWebhookBody },
			POST
		);

		expect(result.status).toBe(400);
		expect((result.body as { message?: string }).message).toContain('x-razorpay-signature');
	});

	it('webhook — a signature but no event id is rejected', async () => {
		const { POST } = await import('@/app/api/payment/webhook/route');
		const result = await expectParity(
			'/api/payment/webhook',
			{ json: validWebhookBody, headers: { 'x-razorpay-signature': 'whatever' } },
			POST
		);

		// The event id is what makes retry-deduplication possible; without it a
		// delivery cannot be processed safely.
		expect(result.status).toBe(400);
		expect((result.body as { message?: string }).message).toContain('x-razorpay-event-id');
	});

	it('webhook — an invalid signature is rejected', async () => {
		const { POST } = await import('@/app/api/payment/webhook/route');
		const result = await expectParity(
			'/api/payment/webhook',
			{
				json: validWebhookBody,
				headers: {
					'x-razorpay-signature': 'definitely-not-a-valid-hmac',
					'x-razorpay-event-id': 'evt_test_1',
				},
			},
			POST
		);

		expect(result.status).toBe(400);
		expect((result.body as { message?: string }).message).toContain('signature');
	});

	it('webhook — a signature over the EXACT raw bytes is accepted', async () => {
		// The whole point of reading the body as text: the HMAC is computed over
		// the bytes Razorpay sent. If the handler re-serialised the parsed object
		// and signed that, key order or unicode escaping could differ and every
		// real webhook would be rejected — silently, as "invalid signature".
		const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'RAZORPAY_WEBHOOK_SECRET';

		// Deliberately awkward spacing, so a re-serialised body would NOT match.
		const raw = JSON.stringify(validWebhookBody, null, 2);
		const signature = sign(raw, secret);

		const { POST } = await import('@/app/api/payment/webhook/route');

		const res = await POST(
			new Request('http://localhost/api/payment/webhook', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-razorpay-signature': signature,
					'x-razorpay-event-id': 'evt_raw_bytes_1',
				},
				body: raw,
			})
		);

		// Past signature verification. The service may still reject the event for
		// business reasons, but it must NOT be a signature failure.
		const body = await res.clone().json();
		expect(JSON.stringify(body)).not.toContain('Invalid webhook signature');
	});

	// ---- failed payment lists -----------------------------------------------

	it('GET /payment/admin/failed — a tourist is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/payment/admin/failed/route');
		const result = await expectParity('/api/payment/admin/failed', { token }, GET);

		// These rows carry customer contact details.
		expect(result.status).toBe(403);
	});

	it('GET /payment/my-failed — any authenticated role is allowed', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/payment/my-failed/route');
		const result = await expectParity('/api/payment/my-failed', { token }, GET);

		// A guide sees declined membership fees, a tourist declined bookings.
		expect(result.status).toBe(200);
		expect(Array.isArray((result.body as { data?: unknown }).data)).toBe(true);
	});

	// ---- refund --------------------------------------------------------------

	it('POST /refund/request — a reason under 5 chars is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { POST } = await import('@/app/api/refund/request/route');
		const result = await expectParity(
			'/api/refund/request',
			{ token, json: { bookingId: 'b1', reason: 'no' } },
			POST
		);

		expect(result.status).toBe(400);
	});

	it('POST /refund/request — any attached role may ask, so no 403 for a guide', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { POST } = await import('@/app/api/refund/request/route');

		// A syntactically valid but non-existent booking id: this exercises the
		// role gate without tripping the Mongoose CastError path covered below.
		const result = await expectParity(
			'/api/refund/request',
			{
				token,
				json: {
					bookingId: '6a6c20eae45d663d657bb397',
					reason: 'Trip cancelled by traveller',
				},
			},
			POST
		);

		// The service does the ownership check; the route must not pre-empt it
		// with a role gate.
		expect(result.status).not.toBe(403);
	});

	/**
	 * DELIBERATE DIVERGENCE from the Express behaviour.
	 *
	 * An error type node-be-utilities' errorHandler does not recognise — a
	 * Mongoose CastError, say — falls through to Express's DEFAULT handler, which
	 * answers with an HTML page. Outside production that page embeds the full
	 * stack trace and absolute server file paths; in production it is still HTML,
	 * which the frontend's JSON unwrap() cannot parse, so the user sees a
	 * confusing failure instead of an error message.
	 *
	 * The native handler returns the project's JSON error envelope with a generic
	 * message and logs the detail server-side. That is strictly better on both
	 * counts, so it is NOT reverted to match. This test pins the improvement so
	 * nobody "restores parity" by accident.
	 */
	it('unrecognised errors return JSON, not an HTML stack trace (improves on Express)', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { POST } = await import('@/app/api/refund/request/route');

		// 'b1' is not castable to an ObjectId, so Mongoose throws a CastError.
		const res = await POST(
			makeRequest('/api/refund/request', {
				token,
				json: { bookingId: 'b1', reason: 'Trip cancelled by traveller' },
			})
		);

		expect(res.headers.get('content-type')).toContain('application/json');

		const body = await res.json();
		expect(body).toMatchObject({ success: false, status: 'error' });

		// Crucially: no stack trace, no file paths, no HTML.
		const serialised = JSON.stringify(body);
		expect(serialised).not.toContain('CastError');
		expect(serialised).not.toContain('node_modules');
		expect(serialised).not.toContain('<!DOCTYPE');
	});

	it('GET /refund — a tourist is refused the admin queue', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/refund/route');
		const result = await expectParity('/api/refund', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('PATCH /refund/:id/approve — a tourist cannot approve their own refund', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { PATCH } = await import('@/app/api/refund/[id]/approve/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/refund/${id}/approve`, {
				method: 'PATCH',
				token,
				json: { approvedAmount: 5000 },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		expect(res.status).toBe(403);
	});

	it('PATCH /refund/:id/approve — a negative amount is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { PATCH } = await import('@/app/api/refund/[id]/approve/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/refund/${id}/approve`, {
				method: 'PATCH',
				token,
				json: { approvedAmount: -1 },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		expect(res.status).toBe(400);
	});

	it('PATCH /refund/:id/approve — zero is a VALID amount', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { PATCH } = await import('@/app/api/refund/[id]/approve/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/refund/${id}/approve`, {
				method: 'PATCH',
				token,
				json: { approvedAmount: 0 },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		// "Cancel the booking, refund nothing" is a real outcome. A .positive()
		// schema would wrongly reject it, so this pins .min(0).
		const result = await normalise(res);
		expect(result.status).not.toBe(400);
	});

	it('PATCH /refund/:id/reject — an empty admin note is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { PATCH } = await import('@/app/api/refund/[id]/reject/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/refund/${id}/reject`, {
				method: 'PATCH',
				token,
				json: { adminNote: '' },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		// The tourist is shown this verbatim.
		expect(res.status).toBe(400);
	});

	it('POST /refund/:id/retry — a guide cannot retry a payout', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { POST } = await import('@/app/api/refund/[id]/retry/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await POST(makeRequest(`/api/refund/${id}/retry`, { token }), {
			params: Promise.resolve({ id }),
		} as never);

		expect(res.status).toBe(403);
	});
});
