import { BookingDB } from '@mongo';

import { expectParity } from '../helpers/parity';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Native booking Route Handlers vs the Express adapter.
 *
 * booking is the largest module in the migration and the one closest to money,
 * so this file leans hard on one thing: **middleware ORDER is contract, not
 * style.** Four routes in booking.route.ts gate in orders that are not
 * interchangeable, and each ordering is pinned below by a case that produces
 * different status codes if the steps are swapped:
 *
 *  - `DELETE /:id` checks admin BEFORE the id, `GET /:id` has no role gate at
 *    all. A tourist sending a malformed id therefore gets 403 from one and 400
 *    from the other. Swap either and the pair starts leaking which ids are
 *    well-formed to callers with no business asking.
 *  - `/customised-booking` and `/package/create-order` validate BEFORE reserving
 *    the idempotency key, so a client that retries after fixing a typo isn't
 *    told its key was already used with a different body.
 *  - `/:id/balance/create-order` validates the id BEFORE demanding the key, and
 *    has no role gate whatsoever — ownership, not rank, decides who may settle a
 *    balance.
 *  - `/:id/balance/verify` checks the id BEFORE the payload.
 *
 * The other property worth stating: **the owner is never a request parameter.**
 * Every route here derives the account from the session and lets the service
 * scope the query by it. A port that accepted an id from the client would pass
 * every status-code assertion in this file and quietly expose one tourist's
 * bookings to another.
 *
 * Order-creation SUCCESS paths are deliberately absent. They mint a real
 * Razorpay order, and a parity run would execute the handler twice — the second
 * call landing in the idempotency replay branch rather than the code under test.
 * They are covered against the Express implementation in booking.test.ts.
 */

describe('booking routes — native vs Express parity', () => {
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

	/** A payload that clears createBookingSchema, for testing what comes after it. */
	const validBookingBody = {
		tourist_info: {
			name: 'John Doe',
			gender: 'male',
			phone: '+1234567890',
			email: 'john@example.com',
			country: 'USA',
		},
		travel_details: {
			places: ['Taj Mahal', 'Red Fort'],
			city: 'Agra',
			date: '2024-12-25',
			no_of_person: 2,
			preferences: { hotel: true, taxi: false },
		},
		guide_preferences: { guide_language: ['English'], gender: 'male' },
		booking_configuration: {
			duration: 'full-day',
			foreign_language_required: true,
			early_late_hours: false,
			extra_city_allowances: false,
			special_event_allowances: [],
			price: 5000,
		},
	};

	const validPackageBody = {
		tourId: '6a6c20eae45d663d657bb397',
		guideId: '6a6c20eae45d663d657bb398',
		startDate: '2026-12-01',
		endDate: '2026-12-05',
		tourists: 2,
	};

	describe('GET /booking/key', () => {
		it('is public and returns the publishable key', async () => {
			const { GET } = await import('@/app/api/booking/key/route');
			const result = await expectParity('/api/booking/key', {}, GET);

			expect(result.status).toBe(200);
			expect(result.body).toHaveProperty('key');
		});
	});

	describe('POST /booking/verify-guest-booking', () => {
		it('an empty body is a bare {success:false} — NOT the error envelope', async () => {
			const { POST } = await import('@/app/api/booking/verify-guest-booking/route');
			const result = await expectParity('/api/booking/verify-guest-booking', { json: {} }, POST);

			// This controller never adopted Respond(), so the reply has no `status`,
			// `title` or `error` key. The checkout page reads `message` off this
			// shape; upgrading it to the standard envelope would break that quietly.
			expect(result.status).toBe(400);
			expect(result.body).toEqual({
				success: false,
				message: 'Missing required payment details',
			});
		});

		it('an EMPTY-STRING signature is refused — the check is falsy, not presence', async () => {
			const { POST } = await import('@/app/api/booking/verify-guest-booking/route');
			const result = await expectParity(
				'/api/booking/verify-guest-booking',
				{
					json: {
						razorpay_order_id: 'order_test',
						razorpay_payment_id: 'pay_test',
						razorpay_signature: '',
						booking_data: 'e30=',
					},
				},
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe(
				'Missing required payment details'
			);
		});

		it('a complete but forged payload fails signature verification', async () => {
			const { POST } = await import('@/app/api/booking/verify-guest-booking/route');
			const result = await expectParity(
				'/api/booking/verify-guest-booking',
				{
					json: {
						razorpay_order_id: 'order_test',
						razorpay_payment_id: 'pay_test',
						razorpay_signature: 'f'.repeat(64),
						booking_data: 'e30=',
					},
				},
				POST
			);

			// Past the field check and into the service, which rejects the HMAC.
			expect(result.status).toBe(500);
			expect((result.body as { message: string }).message).toContain('invalid signature');
		});
	});

	describe('POST /booking/customised-booking', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/booking/customised-booking/route');
			const result = await expectParity(
				'/api/booking/customised-booking',
				{ json: validBookingBody },
				POST
			);

			expect(result.status).toBe(401);
		});

		it('a guide is refused — VerifyRole is exact, not hierarchical', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/booking/customised-booking/route');
			const result = await expectParity(
				'/api/booking/customised-booking',
				{ token, json: validBookingBody },
				POST
			);

			// A guide outranks a tourist in the hierarchy, so requireMinLevel would
			// let it through. This route must not.
			expect(result.status).toBe(403);
		});

		it('validation runs BEFORE idempotency', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/customised-booking/route');
			const result = await expectParity(
				'/api/booking/customised-booking',
				{ token, json: { tourist_info: { name: '' } } },
				POST
			);

			// No x-idempotency-key was sent, yet the reply is about the payload.
			// Reversing the two steps would answer "x-idempotency-key header is
			// required" and never reveal what was actually wrong with the body.
			expect(result.status).toBe(400);
			const { message } = result.body as { message: string };
			expect(message).toContain('tourist_info.name');
			expect(message).toContain('travel_details');
		});

		it('a valid body without an idempotency key is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/customised-booking/route');
			const result = await expectParity(
				'/api/booking/customised-booking',
				{ token, json: validBookingBody },
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('x-idempotency-key');
		});

		it('a malformed idempotency key is refused before anything is reserved', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/customised-booking/route');
			const result = await expectParity(
				'/api/booking/customised-booking',
				{
					token,
					json: validBookingBody,
					headers: { 'x-idempotency-key': 'short' },
				},
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('8-128 characters');
		});
	});

	describe('POST /booking/verify-booking', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/booking/verify-booking/route');
			const result = await expectParity('/api/booking/verify-booking', { json: {} }, POST);

			expect(result.status).toBe(401);
		});

		it('a guide is refused BEFORE the body is inspected', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/booking/verify-booking/route');
			const result = await expectParity('/api/booking/verify-booking', { token, json: {} }, POST);

			// The body is empty, so a body-first order would answer 400 here.
			expect(result.status).toBe(403);
		});

		it('a tourist with an empty body gets the bare {success:false}', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/verify-booking/route');
			const result = await expectParity('/api/booking/verify-booking', { token, json: {} }, POST);

			expect(result.status).toBe(400);
			expect(result.body).toEqual({
				success: false,
				message: 'Missing required payment details',
			});
		});
	});

	describe('GET /booking/my-bookings', () => {
		it('unauthenticated', async () => {
			const { GET } = await import('@/app/api/booking/my-bookings/route');
			const result = await expectParity('/api/booking/my-bookings', {}, GET);

			expect(result.status).toBe(401);
		});

		it('a guide is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/booking/my-bookings/route');
			const result = await expectParity('/api/booking/my-bookings', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('a tourist sees their own bookings and nobody else’s', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			await seedBooking(mine.userId);
			await seedBooking(theirs.userId);

			const { GET } = await import('@/app/api/booking/my-bookings/route');
			const result = await expectParity('/api/booking/my-bookings', { token: mine.token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { bookings: unknown[] }).bookings).toHaveLength(1);
		});
	});

	describe('POST /booking/package/create-order', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/booking/package/create-order/route');
			const result = await expectParity(
				'/api/booking/package/create-order',
				{ json: validPackageBody },
				POST
			);

			expect(result.status).toBe(401);
		});

		it('a guide is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/booking/package/create-order/route');
			const result = await expectParity(
				'/api/booking/package/create-order',
				{ token, json: validPackageBody },
				POST
			);

			expect(result.status).toBe(403);
		});

		it('validation runs BEFORE idempotency', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/package/create-order/route');
			const result = await expectParity(
				'/api/booking/package/create-order',
				{ token, json: { tourId: '', tourists: 0 } },
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('Tour ID is required');
		});

		it('a valid body without an idempotency key is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/package/create-order/route');
			const result = await expectParity(
				'/api/booking/package/create-order',
				{ token, json: validPackageBody },
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('x-idempotency-key');
		});
	});

	describe('POST /booking/package/verify', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/booking/package/verify/route');
			const result = await expectParity('/api/booking/package/verify', { json: {} }, POST);

			expect(result.status).toBe(401);
		});

		it('a tourist with an empty body gets the bare {success:false}', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/package/verify/route');
			const result = await expectParity('/api/booking/package/verify', { token, json: {} }, POST);

			expect(result.status).toBe(400);
			expect(result.body).toEqual({
				success: false,
				message: 'Missing required payment details',
			});
		});
	});

	describe('GET /booking — admin listing', () => {
		it('unauthenticated', async () => {
			const { GET } = await import('@/app/api/booking/route');
			const result = await expectParity('/api/booking', {}, GET);

			expect(result.status).toBe(401);
		});

		it('a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/booking/route');
			const result = await expectParity('/api/booking', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('a guide is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/booking/route');
			const result = await expectParity('/api/booking', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('an admin sees everyone’s', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const admin = await createAuthedUser('admin');
			const tourist = await createAuthedUser('tourist');

			await seedBooking(tourist.userId);
			await seedBooking(tourist.userId);

			const { GET } = await import('@/app/api/booking/route');
			const result = await expectParity('/api/booking', { token: admin.token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { bookings: unknown[] }).bookings).toHaveLength(2);
		});
	});

	describe('POST /booking/:id/allocate-guide', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/booking/[id]/allocate-guide/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/allocate-guide`,
				{ json: { guide_id: KNOWN_MISSING_ID } },
				(request) =>
					POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a tourist with a MALFORMED id is 403, not 400 — admin is checked first', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/[id]/allocate-guide/route');
			const result = await expectParity(
				'/api/booking/nope/allocate-guide',
				{ token, json: { guide_id: KNOWN_MISSING_ID } },
				(request) => POST(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(403);
		});

		it('an admin with a malformed id is 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { POST } = await import('@/app/api/booking/[id]/allocate-guide/route');
			const result = await expectParity(
				'/api/booking/nope/allocate-guide',
				{ token, json: { guide_id: KNOWN_MISSING_ID } },
				(request) => POST(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a malformed id wins over a malformed body — id is validated first', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { POST } = await import('@/app/api/booking/[id]/allocate-guide/route');
			const result = await expectParity(
				'/api/booking/nope/allocate-guide',
				{ token, json: {} },
				(request) => POST(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			// Both are wrong; the id is the one reported.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a good id with a missing guide_id reports the body', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { POST } = await import('@/app/api/booking/[id]/allocate-guide/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/allocate-guide`,
				{ token, json: {} },
				(request) =>
					POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('guide_id');
		});
	});

	describe('DELETE /booking/:id', () => {
		it('unauthenticated', async () => {
			const { DELETE } = await import('@/app/api/booking/[id]/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}`,
				{ method: 'DELETE' },
				(request) =>
					DELETE(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a tourist with a MALFORMED id is 403 — admin is checked before the id', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { DELETE } = await import('@/app/api/booking/[id]/route');
			const result = await expectParity(
				'/api/booking/nope',
				{ token, method: 'DELETE' },
				(request) => DELETE(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			// Contrast with GET /:id below, which has no role gate and answers 400
			// for the same caller and the same id. That difference is the contract.
			expect(result.status).toBe(403);
		});

		it('an admin with an unknown id is 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { DELETE } = await import('@/app/api/booking/[id]/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}`,
				{ token, method: 'DELETE' },
				(request) =>
					DELETE(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('GET /booking/:id', () => {
		it('unauthenticated', async () => {
			const { GET } = await import('@/app/api/booking/[id]/route');
			const result = await expectParity(`/api/booking/${KNOWN_MISSING_ID}`, {}, (request) =>
				GET(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a tourist with a MALFORMED id is 400 — there is no role gate here', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/booking/[id]/route');
			const result = await expectParity('/api/booking/nope', { token }, (request) =>
				GET(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			// The same caller and id that DELETE answers 403 for. Adding a role gate
			// here would lock out either the guide or the tourist view.
			expect(result.status).toBe(400);
		});

		it('another tourist’s booking is a 404, not a 403', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			const booking = await seedBooking(theirs.userId);
			const id = booking._id.toString();

			const { GET } = await import('@/app/api/booking/[id]/route');
			const result = await expectParity(`/api/booking/${id}`, { token: mine.token }, (request) =>
				GET(request, { params: Promise.resolve({ id }) } as never)
			);

			// The lookup is scoped by owner, so a booking that isn't yours simply
			// does not exist as far as this route is concerned.
			expect(result.status).toBe(404);
		});

		it('a tourist reads their own', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token, userId } = await createAuthedUser('tourist');

			const booking = await seedBooking(userId);
			const id = booking._id.toString();

			const { GET } = await import('@/app/api/booking/[id]/route');
			const result = await expectParity(`/api/booking/${id}`, { token }, (request) =>
				GET(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(200);
		});
	});

	describe('GET /booking/:id/transaction-status', () => {
		it('unauthenticated', async () => {
			const { GET } = await import('@/app/api/booking/[id]/transaction-status/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/transaction-status`,
				{},
				(request) => GET(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a malformed id is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/booking/[id]/transaction-status/route');
			const result = await expectParity(
				'/api/booking/nope/transaction-status',
				{ token },
				(request) => GET(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('another tourist’s booking is invisible', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			const booking = await seedBooking(theirs.userId);
			const id = booking._id.toString();

			const { GET } = await import('@/app/api/booking/[id]/transaction-status/route');
			const result = await expectParity(
				`/api/booking/${id}/transaction-status`,
				{ token: mine.token },
				(request) => GET(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('POST /booking/:id/balance/create-order', () => {
		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/booking/[id]/balance/create-order/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/balance/create-order`,
				{ method: 'POST' },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a malformed id is refused BEFORE the idempotency key is demanded', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/[id]/balance/create-order/route');
			const result = await expectParity(
				'/api/booking/nope/balance/create-order',
				{ token, method: 'POST' },
				(request) => POST(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			// No key was sent, and the reply is still about the id.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a good id without a key is refused before the booking is looked up', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/[id]/balance/create-order/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/balance/create-order`,
				{ token, method: 'POST' },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// 400 rather than the 404 the same id gives once a key is supplied:
			// idempotency sits between the id check and the service.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('x-idempotency-key');
		});

		it('a GUIDE is not refused — this route has no role gate', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/booking/[id]/balance/create-order/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/balance/create-order`,
				{ token, method: 'POST' },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// It reaches the idempotency check rather than stopping at 403.
			// Ownership is asserted by the service, not by rank at the door.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('x-idempotency-key');
		});
	});

	describe('POST /booking/:id/balance/verify', () => {
		const validVerifyBody = {
			razorpay_order_id: 'order_test',
			razorpay_payment_id: 'pay_test',
			razorpay_signature: 'f'.repeat(64),
		};

		it('unauthenticated', async () => {
			const { POST } = await import('@/app/api/booking/[id]/balance/verify/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/balance/verify`,
				{ json: validVerifyBody },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('a malformed id wins over a malformed body', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/[id]/balance/verify/route');
			const result = await expectParity(
				'/api/booking/nope/balance/verify',
				{ token, json: {} },
				(request) => POST(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('a good id with an empty body reports the payload', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/[id]/balance/verify/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/balance/verify`,
				{ token, json: {} },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('razorpay_order_id');
		});

		it('an unknown booking is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/booking/[id]/balance/verify/route');
			const result = await expectParity(
				`/api/booking/${KNOWN_MISSING_ID}/balance/verify`,
				{ token, json: validVerifyBody },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('GET /booking/my-reservations', () => {
		it('unauthenticated', async () => {
			const { GET } = await import('@/app/api/booking/my-reservations/route');
			const result = await expectParity('/api/booking/my-reservations', {}, GET);

			expect(result.status).toBe(401);
		});

		it('a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/booking/my-reservations/route');
			const result = await expectParity('/api/booking/my-reservations', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('a guide sees only bookings allocated to them', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const guide = await createAuthedUser('guide');
			const other = await createAuthedUser('guide');
			const tourist = await createAuthedUser('tourist');

			await seedBooking(tourist.userId, { allocated_guide: guide.userId });
			await seedBooking(tourist.userId, { allocated_guide: other.userId });

			const { GET } = await import('@/app/api/booking/my-reservations/route');
			const result = await expectParity('/api/booking/my-reservations', { token: guide.token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { bookings: unknown[] }).bookings).toHaveLength(1);
		});

		it('an admin passes too — this gate is hierarchical, unlike /my-bookings', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/booking/my-reservations/route');
			const result = await expectParity('/api/booking/my-reservations', { token }, GET);

			expect(result.status).toBe(200);
		});
	});

	/**
	 * A minimal booking owned by `userId`, enough for the read paths.
	 *
	 * `transaction_id` is required AND unique on the model — a booking only
	 * exists once a payment has been opened for it — so each seed mints its own.
	 * The parity harness masks the value, since it is generated per run.
	 */
	let seedCounter = 0;
	function seedBooking(userId: string, overrides: Record<string, unknown> = {}) {
		seedCounter += 1;
		return BookingDB.create({
			linked_to: userId,
			transaction_id: `txn-parity-${Date.now()}-${seedCounter}`,
			tourist_info: {
				name: 'John Doe',
				gender: 'male',
				phone: '+1234567890',
				email: 'john@example.com',
				country: 'USA',
			},
			travel_details: {
				places: ['Taj Mahal'],
				city: 'Agra',
				date: new Date('2026-12-25'),
				no_of_person: 2,
				preferences: { hotel: true, taxi: false },
			},
			guide_preferences: { guide_language: ['English'], gender: 'male' },
			booking_configuration: {
				duration: 'full-day',
				foreign_language_required: false,
				early_late_hours: false,
				extra_city_allowances: false,
				special_event_allowances: [],
				price: 5000,
			},
			...overrides,
		});
	}
});
