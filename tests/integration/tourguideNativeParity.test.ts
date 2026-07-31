import { BookingDB, GuideDB } from '@mongo';

import { createAuthedUser } from '../helpers/auth';
import { expectParity } from '../helpers/parity';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Native tourguide Route Handlers vs the Express adapter.
 *
 * tourguide is the DIRECT booking flow: the tourist picks a guide off their
 * public profile and pays an advance against that guide's published day rate.
 * It touches money twice — the advance and the balance — so it inherits the same
 * property booking has, that **middleware ORDER is contract, not style**. Three
 * distinct orderings are pinned below, each by a case that produces a different
 * status code if its steps are swapped:
 *
 *  - `/create-order` validates BEFORE reserving the idempotency key, so a client
 *    retrying after fixing a typo isn't told its key was already used with a
 *    different body.
 *  - `/:id/create-final-order` validates the id BEFORE demanding the key.
 *  - `PATCH /:id/status` and `PATCH /:id/reassign-guide` check admin BEFORE the
 *    id, while `GET /:id`, `/:id/cancel`, `/:id/create-final-order` and
 *    `/:id/verify-final-payment` have no role gate at all. The same non-admin
 *    sending the same malformed id therefore gets 403 from the first pair and
 *    400 from the rest. That split is the contract.
 *
 * The other property worth stating is which gate sits where. The two tourist
 * routes use the EXACT `VerifyRole('tourist','admin')`, not `VerifyMinLevel`:
 * a guide outranks a tourist in the hierarchy, and min-level would let them open
 * bookings against other guides. The four per-booking routes have no gate
 * because ownership, not rank, decides — `BalancePaymentService.assertOwner`,
 * `RefundService.assertCanRequest` and `TourGuideService.assertVisible` each
 * admit a different set that a role check at the door would lock out.
 *
 * Order-creation SUCCESS paths are deliberately absent, as in booking: they mint
 * a real Razorpay order, and a parity run executes the handler twice — the
 * second call landing in the idempotency replay branch rather than the code
 * under test.
 */

describe('tourguide routes — native vs Express parity', () => {
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

	/** Well-formed, but no such booking. Separates "bad id" from "unknown id". */
	const KNOWN_MISSING_ID = '6a6c20eae45d663d657bb397';

	/** A payload that clears createOrderSchema, for testing what comes after it. */
	const validOrderBody = {
		guideId: KNOWN_MISSING_ID,
		location: 'Agra',
		language: 'English',
		startDate: '2026-12-01',
		endDate: '2026-12-03',
		numberOfTravelers: 2,
	};

	const validVerifyBody = {
		razorpay_order_id: 'order_test',
		razorpay_payment_id: 'pay_test',
		razorpay_signature: 'f'.repeat(64),
	};

	describe('GET /tourguide/quote', () => {
		it('is PUBLIC — an unauthenticated caller is not refused', async () => {
			const { GET } = await import('@/app/api/tourguide/quote/route');
			const result = await expectParity(
				`/api/tourguide/quote?guideId=${KNOWN_MISSING_ID}&startDate=2026-12-01&endDate=2026-12-03`,
				{},
				GET
			);

			// No session, and the reply is about the guide rather than the caller.
			// The booking page prices a trip before the tourist signs in.
			expect(result.status).toBe(404);
			expect((result.body as { message: string }).message).toBe('Guide profile not found');
		});

		it('missing query params are a 400', async () => {
			const { GET } = await import('@/app/api/tourguide/quote/route');
			const result = await expectParity('/api/tourguide/quote', {}, GET);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('guideId');
		});

		it('a guide with no published rate cannot be booked directly', async () => {
			const guide = await createAuthedUser('guide');
			await GuideDB.create({ accountId: guide.userId, approvalStatus: 'approved' });

			const { GET } = await import('@/app/api/tourguide/quote/route');
			const result = await expectParity(
				`/api/tourguide/quote?guideId=${guide.userId}&startDate=2026-12-01&endDate=2026-12-03`,
				{},
				GET
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('not published their rates');
		});

		it('prices an approved guide, inclusive of both end dates', async () => {
			const guide = await createAuthedUser('guide');
			await GuideDB.create({
				accountId: guide.userId,
				approvalStatus: 'approved',
				pricing: { fullDay: 2000 },
			});

			const { GET } = await import('@/app/api/tourguide/quote/route');
			const result = await expectParity(
				`/api/tourguide/quote?guideId=${guide.userId}&startDate=2026-12-01&endDate=2026-12-03`,
				{},
				GET
			);

			expect(result.status).toBe(200);
			// Dec 1st–3rd is three days, not two: daysBetween is inclusive.
			expect(result.body).toMatchObject({ days: 3, dayRate: 2000, totalPrice: 6000 });
		});
	});

	describe('POST /tourguide/create-order', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/tourguide/create-order/route');
			const result = await expectParity(
				'/api/tourguide/create-order',
				{ json: validOrderBody },
				POST
			);

			expect(result.status).toBe(401);
		});

		it('a GUIDE is refused — VerifyRole is exact, not hierarchical', async () => {
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/tourguide/create-order/route');
			const result = await expectParity(
				'/api/tourguide/create-order',
				{ token, json: validOrderBody },
				POST
			);

			// A guide outranks a tourist, so requireMinLevel would let this through
			// and let one guide open bookings against another.
			expect(result.status).toBe(403);
		});

		it('a guide is refused BEFORE the body is inspected', async () => {
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/tourguide/create-order/route');
			const result = await expectParity('/api/tourguide/create-order', { token, json: {} }, POST);

			// The body is empty, so a body-first order would answer 400 here.
			expect(result.status).toBe(403);
		});

		it('validation runs BEFORE idempotency', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/create-order/route');
			const result = await expectParity(
				'/api/tourguide/create-order',
				{ token, json: { guideId: '', location: '' } },
				POST
			);

			// No x-idempotency-key was sent, yet the reply is about the payload.
			// Reversing the two would answer "x-idempotency-key header is required"
			// and never reveal what was actually wrong with the body.
			expect(result.status).toBe(400);
			const { message } = result.body as { message: string };
			expect(message).toContain('guideId is required');
			expect(message).toContain('location is required');
		});

		it('a valid body without an idempotency key is refused', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/create-order/route');
			const result = await expectParity(
				'/api/tourguide/create-order',
				{ token, json: validOrderBody },
				POST
			);

			// 400 rather than the 404 the same unknown guideId gives once a key is
			// supplied: idempotency sits between the validator and the service.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('x-idempotency-key');
		});

		it('a malformed idempotency key is refused before anything is reserved', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/create-order/route');
			const result = await expectParity(
				'/api/tourguide/create-order',
				{ token, json: validOrderBody, headers: { 'x-idempotency-key': 'short' } },
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('8-128 characters');
		});

		it('an unknown guide is a 404 once the key is present', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/create-order/route');
			const result = await expectParity(
				'/api/tourguide/create-order',
				{
					token,
					json: validOrderBody,
					headers: { 'x-idempotency-key': 'parity-unknown-guide-1' },
				},
				POST
			);

			// A failed attempt must not burn the key, which is what lets the Express
			// half of this run reserve the very same key and reach the same answer.
			expect(result.status).toBe(404);
			expect((result.body as { message: string }).message).toBe('Guide not found');
		});

		it('the price is NOT accepted from the client', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/create-order/route');
			const result = await expectParity(
				'/api/tourguide/create-order',
				{
					token,
					json: { ...validOrderBody, totalPrice: 1, advance: 1 },
					headers: { 'x-idempotency-key': 'parity-price-tamper-1' },
				},
				POST
			);

			// The extra fields are ignored rather than rejected, and the flow carries
			// on to look the guide up — the rate comes from the guide's profile.
			expect(result.status).toBe(404);
			expect((result.body as { message: string }).message).toBe('Guide not found');
		});
	});

	describe('POST /tourguide/verify-and-create', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/tourguide/verify-and-create/route');
			const result = await expectParity('/api/tourguide/verify-and-create', { json: {} }, POST);

			expect(result.status).toBe(401);
		});

		it('a guide is refused BEFORE the body is inspected', async () => {
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/tourguide/verify-and-create/route');
			const result = await expectParity(
				'/api/tourguide/verify-and-create',
				{ token, json: {} },
				POST
			);

			expect(result.status).toBe(403);
		});

		it('a tourist with an empty body gets the validator', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/verify-and-create/route');
			const result = await expectParity(
				'/api/tourguide/verify-and-create',
				{ token, json: {} },
				POST
			);

			// Unlike booking's three verify endpoints, this one goes through zod and
			// therefore through the standard error envelope — not the bare
			// {success:false} shape. Do not harmonise them.
			expect(result.status).toBe(400);
			const { message } = result.body as { message: string };
			expect(message).toContain('razorpay_order_id');
			expect(message).toContain('booking_data');
		});

		it('booking_data is required here, unlike the balance verify', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/verify-and-create/route');
			const result = await expectParity(
				'/api/tourguide/verify-and-create',
				{ token, json: validVerifyBody },
				POST
			);

			// The same payload that satisfies /:id/verify-final-payment is rejected
			// here, which is why the two schemas are separate.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('booking_data');
		});

		it('a complete but forged payload fails signature verification', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/verify-and-create/route');
			const result = await expectParity(
				'/api/tourguide/verify-and-create',
				{ token, json: { ...validVerifyBody, booking_data: 'e30=' } },
				POST
			);

			// Past the validator and into the service, which rejects the HMAC before
			// it ever looks a transaction up.
			expect(result.status).toBe(500);
			expect((result.body as { message: string }).message).toContain('invalid signature');
		});
	});

	describe('GET /tourguide/user-bookings', () => {
		it('unauthenticated', async () => {
			const { GET } = await import('@/app/api/tourguide/user-bookings/route');
			const result = await expectParity('/api/tourguide/user-bookings', {}, GET);

			expect(result.status).toBe(401);
		});

		it('a guide is refused', async () => {
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/tourguide/user-bookings/route');
			const result = await expectParity('/api/tourguide/user-bookings', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('a tourist sees their own direct bookings and nobody else’s', async () => {
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			await seedDirectBooking(mine.userId);
			await seedDirectBooking(theirs.userId);

			const { GET } = await import('@/app/api/tourguide/user-bookings/route');
			const result = await expectParity(
				'/api/tourguide/user-bookings',
				{ token: mine.token },
				GET
			);

			expect(result.status).toBe(200);
			expect((result.body as { data: unknown[] }).data).toHaveLength(1);
		});

		it('an admin-allocated booking is NOT listed — the query is scoped by type', async () => {
			const { token, userId } = await createAuthedUser('tourist');

			await seedDirectBooking(userId);
			// 'guide' is the default booking_type — the admin-allocated flow in
			// /booking. Only 'guide_direct' belongs to this module.
			await seedDirectBooking(userId, { booking_type: 'guide' });

			const { GET } = await import('@/app/api/tourguide/user-bookings/route');
			const result = await expectParity('/api/tourguide/user-bookings', { token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { data: unknown[] }).data).toHaveLength(1);
		});

		it('a non-numeric limit is a 400 — unlike /user, this module does validate', async () => {
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/tourguide/user-bookings/route');
			const result = await expectParity(
				'/api/tourguide/user-bookings?page=1&limit=abc',
				{ token },
				GET
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('limit');
		});
	});

	describe('GET /tourguide/all', () => {
		it('unauthenticated', async () => {
			const { GET } = await import('@/app/api/tourguide/all/route');
			const result = await expectParity('/api/tourguide/all', {}, GET);

			expect(result.status).toBe(401);
		});

		it('a tourist is refused', async () => {
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/tourguide/all/route');
			const result = await expectParity('/api/tourguide/all', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('a guide is refused', async () => {
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/tourguide/all/route');
			const result = await expectParity('/api/tourguide/all', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('an admin sees every tourist’s', async () => {
			const admin = await createAuthedUser('admin');
			const tourist = await createAuthedUser('tourist');

			await seedDirectBooking(tourist.userId);
			await seedDirectBooking(tourist.userId);

			const { GET } = await import('@/app/api/tourguide/all/route');
			const result = await expectParity('/api/tourguide/all', { token: admin.token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { data: unknown[] }).data).toHaveLength(2);
		});
	});

	describe('POST /tourguide/:id/create-final-order', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/tourguide/[id]/create-final-order/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/create-final-order`,
				{ method: 'POST' },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a malformed id is refused BEFORE the idempotency key is demanded', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/[id]/create-final-order/route');
			const result = await expectParity(
				'/api/tourguide/nope/create-final-order',
				{ token, method: 'POST' },
				(request) => POST(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			// No key was sent, and the reply is still about the id.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a good id without a key is refused before the booking is looked up', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/[id]/create-final-order/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/create-final-order`,
				{ token, method: 'POST' },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// 400 rather than the 404 the same id gives once a key is supplied.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('x-idempotency-key');
		});

		it('a GUIDE is not refused — this route has no role gate', async () => {
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/tourguide/[id]/create-final-order/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/create-final-order`,
				{ token, method: 'POST' },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// It reaches the idempotency check rather than stopping at 403. Ownership
			// is asserted by BalancePaymentService, not by rank at the door.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('x-idempotency-key');
		});

		it('another tourist’s booking is a 403 once the key is present', async () => {
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			const booking = await seedDirectBooking(theirs.userId);
			const id = booking._id.toString();

			const { POST } = await import('@/app/api/tourguide/[id]/create-final-order/route');
			const result = await expectParity(
				`/api/tourguide/${id}/create-final-order`,
				{
					token: mine.token,
					method: 'POST',
					headers: { 'x-idempotency-key': 'parity-final-order-1' },
				},
				(request) => POST(request, { params: Promise.resolve({ id }) } as never)
			);

			// assertOwner looks the booking up first and then refuses, so this is a
			// 403 — not the 404 that owner-scoped queries elsewhere produce.
			expect(result.status).toBe(403);
		});
	});

	describe('POST /tourguide/:id/verify-final-payment', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/tourguide/[id]/verify-final-payment/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/verify-final-payment`,
				{ json: validVerifyBody },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a malformed id wins over a malformed body', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/[id]/verify-final-payment/route');
			const result = await expectParity(
				'/api/tourguide/nope/verify-final-payment',
				{ token, json: {} },
				(request) => POST(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a good id with an empty body reports the payload', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/[id]/verify-final-payment/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/verify-final-payment`,
				{ token, json: {} },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('razorpay_order_id');
		});

		it('an unknown booking is a 404', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/[id]/verify-final-payment/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/verify-final-payment`,
				{ token, json: validVerifyBody },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('POST /tourguide/:id/cancel', () => {
		const validReason = 'Plans changed, I cannot travel that week';

		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/tourguide/[id]/cancel/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/cancel`,
				{ json: { reason: validReason } },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a malformed id wins over a malformed body', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/[id]/cancel/route');
			const result = await expectParity(
				'/api/tourguide/nope/cancel',
				{ token, json: {} },
				(request) => POST(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a too-short reason is refused', async () => {
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/tourguide/[id]/cancel/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/cancel`,
				{ token, json: { reason: 'no' } },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('at least 5 characters');
		});

		it('a GUIDE is not refused at the door — there is no role gate', async () => {
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/tourguide/[id]/cancel/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/cancel`,
				{ token, json: { reason: validReason } },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// The allocated guide may raise a cancellation too, so the decision is
			// RefundService.assertCanRequest's — reached only after the lookup, which
			// is why an unknown booking is a 404 rather than a 403.
			expect(result.status).toBe(404);
		});

		it('a tourist who does not own the booking is refused by the service', async () => {
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			const booking = await seedDirectBooking(theirs.userId);
			const id = booking._id.toString();

			const { POST } = await import('@/app/api/tourguide/[id]/cancel/route');
			const result = await expectParity(
				`/api/tourguide/${id}/cancel`,
				{ token: mine.token, json: { reason: validReason } },
				(request) => POST(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(403);
		});
	});

	describe('PATCH /tourguide/:id/status', () => {
		it('unauthenticated', async () => {
			const { PATCH } = await import('@/app/api/tourguide/[id]/status/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/status`,
				{ method: 'PATCH', json: { status: 'Completed' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a tourist with a MALFORMED id is 403 — admin is checked before the id', async () => {
			const { token } = await createAuthedUser('tourist');

			const { PATCH } = await import('@/app/api/tourguide/[id]/status/route');
			const result = await expectParity(
				'/api/tourguide/nope/status',
				{ token, method: 'PATCH', json: { status: 'Completed' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			// Contrast with GET /tourguide/:id below, which has no role gate and
			// answers 400 for the same caller and the same id.
			expect(result.status).toBe(403);
		});

		it('an admin with a malformed id is 400', async () => {
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/tourguide/[id]/status/route');
			const result = await expectParity(
				'/api/tourguide/nope/status',
				{ token, method: 'PATCH', json: { status: 'Completed' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a malformed id wins over a malformed body — id is validated first', async () => {
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/tourguide/[id]/status/route');
			const result = await expectParity(
				'/api/tourguide/nope/status',
				{ token, method: 'PATCH', json: {} },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('an unrecognised status is refused — the enum is the UI’s vocabulary', async () => {
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/tourguide/[id]/status/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/status`,
				{ token, method: 'PATCH', json: { status: 'completed' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// Lower-case 'completed' is the Booking model's own enum, not the API's.
			// The service maps between the two; the route does not accept both.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('status');
		});

		it('an unknown booking is a 404', async () => {
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/tourguide/[id]/status/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/status`,
				{ token, method: 'PATCH', json: { status: 'Completed' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('PATCH /tourguide/:id/reassign-guide', () => {
		it('unauthenticated', async () => {
			const { PATCH } = await import('@/app/api/tourguide/[id]/reassign-guide/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/reassign-guide`,
				{ method: 'PATCH', json: { newGuideId: KNOWN_MISSING_ID } },
				(request) => PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a GUIDE with a malformed id is 403 — admin is checked before the id', async () => {
			const { token } = await createAuthedUser('guide');

			const { PATCH } = await import('@/app/api/tourguide/[id]/reassign-guide/route');
			const result = await expectParity(
				'/api/tourguide/nope/reassign-guide',
				{ token, method: 'PATCH', json: { newGuideId: KNOWN_MISSING_ID } },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(403);
		});

		it('an admin with a malformed id is 400', async () => {
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/tourguide/[id]/reassign-guide/route');
			const result = await expectParity(
				'/api/tourguide/nope/reassign-guide',
				{ token, method: 'PATCH', json: { newGuideId: KNOWN_MISSING_ID } },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a good id with a missing newGuideId reports the body', async () => {
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/tourguide/[id]/reassign-guide/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/reassign-guide`,
				{ token, method: 'PATCH', json: {} },
				(request) => PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('newGuideId');
		});

		it('an unknown booking is a 404', async () => {
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/tourguide/[id]/reassign-guide/route');
			const result = await expectParity(
				`/api/tourguide/${KNOWN_MISSING_ID}/reassign-guide`,
				{ token, method: 'PATCH', json: { newGuideId: KNOWN_MISSING_ID } },
				(request) => PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('GET /tourguide/:id', () => {
		it('unauthenticated', async () => {
			const { GET } = await import('@/app/api/tourguide/[id]/route');
			const result = await expectParity(`/api/tourguide/${KNOWN_MISSING_ID}`, {}, (request) =>
				GET(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a tourist with a MALFORMED id is 400 — there is no role gate here', async () => {
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/tourguide/[id]/route');
			const result = await expectParity('/api/tourguide/nope', { token }, (request) =>
				GET(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			// The same caller and id that PATCH /:id/status answers 403 for.
			expect(result.status).toBe(400);
		});

		it('another tourist’s booking is a 403, NOT a 404', async () => {
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			const booking = await seedDirectBooking(theirs.userId);
			const id = booking._id.toString();

			const { GET } = await import('@/app/api/tourguide/[id]/route');
			const result = await expectParity(`/api/tourguide/${id}`, { token: mine.token }, (request) =>
				GET(request, { params: Promise.resolve({ id }) } as never)
			);

			// Deliberately different from GET /booking/:id, which scopes its lookup by
			// owner and so answers 404. Here the booking is found first and
			// assertVisible refuses afterwards.
			expect(result.status).toBe(403);
		});

		it('a tourist reads their own', async () => {
			const { token, userId } = await createAuthedUser('tourist');

			const booking = await seedDirectBooking(userId);
			const id = booking._id.toString();

			const { GET } = await import('@/app/api/tourguide/[id]/route');
			const result = await expectParity(`/api/tourguide/${id}`, { token }, (request) =>
				GET(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(200);
		});

		it('the allocated guide is refused — a PRE-EXISTING bug, reproduced deliberately', async () => {
			const tourist = await createAuthedUser('tourist');
			const guide = await createAuthedUser('guide');

			const booking = await seedDirectBooking(tourist.userId, {
				allocated_guide: guide.userId,
			});
			const id = booking._id.toString();

			const { GET } = await import('@/app/api/tourguide/[id]/route');
			const result = await expectParity(`/api/tourguide/${id}`, { token: guide.token }, (request) =>
				GET(request, { params: Promise.resolve({ id }) } as never)
			);

			// `assertVisible` intends to admit the allocated guide, and does not:
			// `getById` runs `.populate('allocated_guide', …).lean()` first, so by the
			// time the check runs `booking.allocated_guide` is a plain object and
			// `.toString()` yields '[object Object]', which never equals a user id.
			// `linked_to` is not populated, which is why the tourist path works.
			//
			// This predates the migration and lives in server/services/tourguide.ts,
			// not in the port — both halves of this parity run agree on 403. It is
			// pinned here rather than fixed so the port stays behaviour-preserving;
			// fixing it is a separate, deliberate change.
			expect(result.status).toBe(403);
		});

		it('an admin reads anyone’s', async () => {
			const admin = await createAuthedUser('admin');
			const tourist = await createAuthedUser('tourist');

			const booking = await seedDirectBooking(tourist.userId);
			const id = booking._id.toString();

			const { GET } = await import('@/app/api/tourguide/[id]/route');
			const result = await expectParity(`/api/tourguide/${id}`, { token: admin.token }, (request) =>
				GET(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(200);
		});
	});

	/**
	 * A minimal direct booking owned by `userId`.
	 *
	 * `booking_type: 'guide_direct'` is what the list routes filter on, and
	 * `transaction_id` is required AND unique on the model — a booking only exists
	 * once a payment has been opened for it — so each seed mints its own. The
	 * parity harness masks the value, since it is generated per run.
	 */
	let seedCounter = 0;
	function seedDirectBooking(userId: string, overrides: Record<string, unknown> = {}) {
		seedCounter += 1;
		return BookingDB.create({
			booking_type: 'guide_direct',
			linked_to: userId,
			transaction_id: `txn-tourguide-parity-${Date.now()}-${seedCounter}`,
			tourist_info: {
				name: 'John Doe',
				gender: 'other',
				phone: '+1234567890',
				email: 'john@example.com',
				country: 'N/A',
			},
			travel_details: {
				places: ['Agra'],
				city: 'Agra',
				date: new Date('2026-12-01'),
				no_of_person: 2,
				preferences: { hotel: false, taxi: false },
			},
			guide_preferences: { guide_language: ['English'], gender: 'none' },
			booking_configuration: {
				duration: 'full-day',
				foreign_language_required: false,
				early_late_hours: false,
				extra_city_allowances: false,
				special_event_allowances: [],
				price: 6000,
			},
			end_date: new Date('2026-12-03'),
			advance_paid: 1800,
			balance_due: 4200,
			status: 'successful',
			...overrides,
		});
	}
});
