import { expectParity } from '../helpers/parity';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Native trip / review / user / guideAvailability Route Handlers vs the Express
 * adapter.
 *
 * These four are ordinary CRUD compared with booking, so the risk moves from
 * middleware ordering to **which gate sits on which route**. Several pairs here
 * are one word apart and gated differently, and transposing them would pass a
 * casual reading:
 *
 *  - `/trip/my` is the GUIDE's trips, `/trip/mine` the TOURIST's.
 *  - `/review/my` is what a tourist WROTE, `/review/mine/guide` what a guide
 *    RECEIVED, and `/review/guide/:guideId` is the PUBLIC list.
 *  - `POST /review` and `GET /review` share a path and do not share a gate:
 *    tourist writes, admin reads.
 *  - `/trip/:id/start` and `/complete` are guide-level; `/cancel` is admin-only,
 *    because cancelling is what triggers a refund.
 *  - `/guide-availability/calendar/me` is the guide's own; `/calendar/:id` is
 *    admin-only.
 *
 * The user module is the one place with no zod validators — its pagination is
 * `parseInt(...) || default`, so `?limit=0` and `?limit=abc` fall back rather
 * than 400ing, and `?limit=12abc` parses as 12. Those three are pinned below,
 * because a schema is the obvious "improvement" and it would change all three.
 */

describe('trip / review / user / guideAvailability — native vs Express parity', () => {
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

	const KNOWN_MISSING_ID = '6a6c20eae45d663d657bb397';

	describe('trip', () => {
		it('GET /trip — unauthenticated', async () => {
			const { GET } = await import('@/app/api/trip/route');
			const result = await expectParity('/api/trip', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /trip — a guide is refused; this is the admin list', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/trip/route');
			const result = await expectParity('/api/trip', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /trip — an admin gets a paginated envelope', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/trip/route');
			const result = await expectParity('/api/trip', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /trip?status=bogus — an unknown status is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/trip/route');
			const result = await expectParity('/api/trip?status=bogus', { token }, GET);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('status');
		});

		it('GET /trip?limit=101 — over the cap is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/trip/route');
			const result = await expectParity('/api/trip?limit=101', { token }, GET);

			expect(result.status).toBe(400);
		});

		it('GET /trip/my — the guide view refuses a tourist', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/trip/my/route');
			const result = await expectParity('/api/trip/my', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /trip/my — a guide is admitted', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/trip/my/route');
			const result = await expectParity('/api/trip/my', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /trip/mine — the tourist view admits a tourist', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			// The mirror of /trip/my above: same caller, opposite outcome.
			const { GET } = await import('@/app/api/trip/mine/route');
			const result = await expectParity('/api/trip/mine', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /trip/mine — unauthenticated', async () => {
			const { GET } = await import('@/app/api/trip/mine/route');
			const result = await expectParity('/api/trip/mine', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /trip/:id — a malformed id is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/trip/[id]/route');
			const result = await expectParity('/api/trip/nope', { token }, (request) =>
				GET(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('PATCH /trip/:id/start — a tourist with a malformed id is 403, not 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { PATCH } = await import('@/app/api/trip/[id]/start/route');
			const result = await expectParity(
				'/api/trip/nope/start',
				{ token, method: 'PATCH', json: {} },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			// The role gate runs before the id check.
			expect(result.status).toBe(403);
		});

		it('PATCH /trip/:id/start — a guide with an unknown id is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { PATCH } = await import('@/app/api/trip/[id]/start/route');
			const result = await expectParity(
				`/api/trip/${KNOWN_MISSING_ID}/start`,
				{ token, method: 'PATCH', json: {} },
				(request) =>
					PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});

		it('PATCH /trip/:id/complete — a guide with an unknown id is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { PATCH } = await import('@/app/api/trip/[id]/complete/route');
			const result = await expectParity(
				`/api/trip/${KNOWN_MISSING_ID}/complete`,
				{ token, method: 'PATCH', json: {} },
				(request) =>
					PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});

		it('PATCH /trip/:id/cancel — a GUIDE is refused; cancel is admin-only', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { PATCH } = await import('@/app/api/trip/[id]/cancel/route');
			const result = await expectParity(
				`/api/trip/${KNOWN_MISSING_ID}/cancel`,
				{ token, method: 'PATCH', json: {} },
				(request) =>
					PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// The same guide may start and complete a trip (404s above) but not
			// cancel one — cancelling is what triggers the refund path.
			expect(result.status).toBe(403);
		});
	});

	describe('review', () => {
		it('GET /review/guide/:guideId — public, no session required', async () => {
			const { GET } = await import('@/app/api/review/guide/[guideId]/route');
			const result = await expectParity(
				`/api/review/guide/${KNOWN_MISSING_ID}`,
				{},
				(request) =>
					GET(request, { params: Promise.resolve({ guideId: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(200);
		});

		it('POST /review — unauthenticated', async () => {
			const { POST } = await import('@/app/api/review/route');
			const result = await expectParity(
				'/api/review',
				{ json: { bookingId: KNOWN_MISSING_ID, rating: 5 } },
				POST
			);

			expect(result.status).toBe(401);
		});

		it('POST /review — rating 6 is out of range', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/review/route');
			const result = await expectParity(
				'/api/review',
				{ token, json: { bookingId: KNOWN_MISSING_ID, rating: 6 } },
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('at most 5');
		});

		it('POST /review — a missing bookingId reports zod’s own message', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/review/route');
			const result = await expectParity('/api/review', { token, json: { rating: 5 } }, POST);

			// An ABSENT key never reaches `.min(1)`, so the custom "Booking ID is
			// required" does not fire — zod's own type message does. The frontend
			// renders this string verbatim, so which one appears is contract.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe(
				'bookingId: Invalid input: expected string, received undefined'
			);
		});

		it('POST /review — an EMPTY bookingId is what triggers the custom message', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/review/route');
			const result = await expectParity(
				'/api/review',
				{ token, json: { bookingId: '   ', rating: 5 } },
				POST
			);

			// Trimmed to empty, so `.min(1, 'Booking ID is required')` fires here.
			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('Booking ID is required');
		});

		it('GET /review — a tourist may POST but not read the admin list', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			// Same path as POST /review, deliberately a different gate.
			const { GET } = await import('@/app/api/review/route');
			const result = await expectParity('/api/review', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /review — an admin reads it', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/review/route');
			const result = await expectParity('/api/review', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /review?minRating=9 — out of range is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/review/route');
			const result = await expectParity('/api/review?minRating=9', { token }, GET);

			expect(result.status).toBe(400);
		});

		it('GET /review/my — the tourist’s own reviews', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/review/my/route');
			const result = await expectParity('/api/review/my', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /review/mine/guide — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			// /review/my admits this same caller; /review/mine/guide must not.
			const { GET } = await import('@/app/api/review/mine/guide/route');
			const result = await expectParity('/api/review/mine/guide', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /review/mine/guide — a guide reads what they received', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/review/mine/guide/route');
			const result = await expectParity('/api/review/mine/guide', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('PATCH /review/:id/hide — a malformed id is a 400 for an admin', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/review/[id]/hide/route');
			const result = await expectParity(
				'/api/review/nope/hide',
				{ token, method: 'PATCH', json: { isHidden: true } },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toBe('Invalid ID');
		});

		it('PATCH /review/:id/hide — isHidden is required', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/review/[id]/hide/route');
			const result = await expectParity(
				`/api/review/${KNOWN_MISSING_ID}/hide`,
				{ token, method: 'PATCH', json: {} },
				(request) =>
					PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('isHidden');
		});

		it('DELETE /review/:id — a tourist with a malformed id is 403', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { DELETE } = await import('@/app/api/review/[id]/route');
			const result = await expectParity(
				'/api/review/nope',
				{ token, method: 'DELETE' },
				(request) => DELETE(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(403);
		});

		it('DELETE /review/:id — an admin with an unknown id is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { DELETE } = await import('@/app/api/review/[id]/route');
			const result = await expectParity(
				`/api/review/${KNOWN_MISSING_ID}`,
				{ token, method: 'DELETE' },
				(request) =>
					DELETE(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('user', () => {
		it('GET /user/me — unauthenticated', async () => {
			const { GET } = await import('@/app/api/user/me/route');
			const result = await expectParity('/api/user/me', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /user/me — any signed-in role, no floor', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token, email } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/user/me/route');
			const result = await expectParity('/api/user/me', { token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { email: string }).email).toBe(email);
		});

		it('GET /users/me — the alias mount serves the same handler', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/users/me/route');
			const result = await expectParity('/api/users/me', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /user — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/user/route');
			const result = await expectParity('/api/user', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /user — an admin lists accounts', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/user/route');
			const result = await expectParity('/api/user', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /user?limit=abc — a non-numeric limit falls back, it does NOT 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/user/route');
			const result = await expectParity('/api/user?limit=abc', { token }, GET);

			// `parseInt('abc') || 20`. A zod schema here would answer 400 — which is
			// why user deliberately has no validator.
			expect(result.status).toBe(200);
		});

		it('GET /user?limit=0 — zero is falsy, so it falls back too', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/user/route');
			const result = await expectParity('/api/user?limit=0&page=0', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /user?limit=12abc — parseInt stops at the first non-digit', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/user/route');
			const result = await expectParity('/api/user?limit=12abc', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /user?query= — the search alias is honoured', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/user/route');
			const result = await expectParity('/api/user?query=nobody-by-this-name', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /user/tourists — admin only', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/user/tourists/route');
			const result = await expectParity('/api/user/tourists', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /user/tourists — an admin reads it', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/user/tourists/route');
			const result = await expectParity('/api/user/tourists', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /user/role/:role — an admin filters by role', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			await createAuthedUser('guide');

			const { GET } = await import('@/app/api/user/role/[role]/route');
			const result = await expectParity('/api/user/role/guide', { token }, (request) =>
				GET(request, { params: Promise.resolve({ role: 'guide' }) } as never)
			);

			expect(result.status).toBe(200);
		});

		it('GET /user/role/:role — an unknown role matches nothing rather than 400ing', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/user/role/[role]/route');
			const result = await expectParity('/api/user/role/wizard', { token }, (request) =>
				GET(request, { params: Promise.resolve({ role: 'wizard' }) } as never)
			);

			// The role is passed through unvalidated, exactly as the controller does.
			expect(result.status).toBe(200);
		});

		it('DELETE /user/:id — a tourist with a malformed id is 403', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { DELETE } = await import('@/app/api/user/[id]/route');
			const result = await expectParity('/api/user/nope', { token, method: 'DELETE' }, (request) =>
				DELETE(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(403);
		});

		it('DELETE /user/:id — an admin with a malformed id is 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { DELETE } = await import('@/app/api/user/[id]/route');
			const result = await expectParity('/api/user/nope', { token, method: 'DELETE' }, (request) =>
				DELETE(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('PATCH /user/:id/activate — unauthenticated', async () => {
			const { PATCH } = await import('@/app/api/user/[id]/activate/route');
			const result = await expectParity(
				`/api/user/${KNOWN_MISSING_ID}/activate`,
				{ method: 'PATCH' },
				(request) =>
					PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('PATCH /user/:id/activate — an admin with an unknown id is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/user/[id]/activate/route');
			const result = await expectParity(
				`/api/user/${KNOWN_MISSING_ID}/activate`,
				{ token, method: 'PATCH' },
				(request) =>
					PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('guideAvailability', () => {
		it('POST /guide-availability/leave — unauthenticated', async () => {
			const { POST } = await import('@/app/api/guide-availability/leave/route');
			const result = await expectParity(
				'/api/guide-availability/leave',
				{ json: { type: 'vacation', startDate: '2026-12-01', endDate: '2026-12-05' } },
				POST
			);

			expect(result.status).toBe(401);
		});

		it('POST /guide-availability/leave — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/guide-availability/leave/route');
			const result = await expectParity(
				'/api/guide-availability/leave',
				{ token, json: { type: 'vacation', startDate: '2026-12-01', endDate: '2026-12-05' } },
				POST
			);

			expect(result.status).toBe(403);
		});

		it('POST /guide-availability/leave — an unknown type is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/guide-availability/leave/route');
			const result = await expectParity(
				'/api/guide-availability/leave',
				{ token, json: { type: 'sabbatical', startDate: '2026-12-01', endDate: '2026-12-05' } },
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain(
				'Type must be vacation or emergency'
			);
		});

		it('POST /guide-availability/leave — a missing endDate is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { POST } = await import('@/app/api/guide-availability/leave/route');
			const result = await expectParity(
				'/api/guide-availability/leave',
				{ token, json: { type: 'vacation', startDate: '2026-12-01' } },
				POST
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('endDate');
		});

		it('GET /guide-availability/leave/my — a guide reads their own', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/guide-availability/leave/my/route');
			const result = await expectParity('/api/guide-availability/leave/my', { token }, GET);

			// The array is nested under `data` rather than spread onto the root —
			// a bare array through Respond() would arrive index-keyed.
			expect(result.status).toBe(200);
			expect(Array.isArray((result.body as { data: unknown[] }).data)).toBe(true);
		});

		it('DELETE /guide-availability/leave/:id — a malformed id is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { DELETE } = await import('@/app/api/guide-availability/leave/[id]/route');
			const result = await expectParity(
				'/api/guide-availability/leave/nope',
				{ token, method: 'DELETE' },
				(request) => DELETE(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('GET /guide-availability/calendar/me — a guide reads their own calendar', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/guide-availability/calendar/me/route');
			const result = await expectParity('/api/guide-availability/calendar/me', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /guide-availability/calendar/:id — a GUIDE is refused; this one is admin', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/guide-availability/calendar/[id]/route');
			const result = await expectParity(
				`/api/guide-availability/calendar/${KNOWN_MISSING_ID}`,
				{ token },
				(request) => GET(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// /calendar/me admits this same caller. The difference is that here the
			// guide is chosen by the caller rather than taken from the session.
			expect(result.status).toBe(403);
		});

		it('GET /guide-availability/guides — startDate is required', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/guide-availability/guides/route');
			const result = await expectParity('/api/guide-availability/guides', { token }, GET);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('startDate');
		});

		it('GET /guide-availability/guides — a guide is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('guide');

			const { GET } = await import('@/app/api/guide-availability/guides/route');
			const result = await expectParity(
				'/api/guide-availability/guides?startDate=2026-12-01',
				{ token },
				GET
			);

			expect(result.status).toBe(403);
		});

		it('GET /guide-availability/guides — an admin gets the annotated list', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			await createAuthedUser('guide');

			const { GET } = await import('@/app/api/guide-availability/guides/route');
			const result = await expectParity(
				'/api/guide-availability/guides?startDate=2026-12-01',
				{ token },
				GET
			);

			expect(result.status).toBe(200);
			expect(Array.isArray((result.body as { data: unknown[] }).data)).toBe(true);
		});

		it('GET /guide-availability/guides — endDate defaults to startDate', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/guide-availability/guides/route');
			const result = await expectParity(
				'/api/guide-availability/guides?startDate=2026-12-01&endDate=2026-12-31',
				{ token },
				GET
			);

			expect(result.status).toBe(200);
		});
	});
});
