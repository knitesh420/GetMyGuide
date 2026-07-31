import { NotificationDB } from '@mongo';

import { expectParity, makeRequest, normalise } from '../helpers/parity';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Native notification and message Route Handlers vs the Express adapter.
 *
 * Both modules share one property worth stating plainly: **the recipient is
 * never a request parameter.** Every route here scopes to the session's userId,
 * or hands the whole session payload to a service that authorises against the
 * booking. A port that accepted an id from the client instead would pass every
 * status-code test in this file and quietly let one account read another's
 * notifications and conversations.
 */

describe('notification and message routes — native vs Express parity', () => {
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

	const seedNotification = (recipient: string, overrides: Record<string, unknown> = {}) =>
		NotificationDB.create({
			recipient,
			type: 'booking_updated',
			title: 'Your booking changed',
			message: 'The itinerary was updated.',
			dedupeKey: `dedupe-${Math.random().toString(36).slice(2)}`,
			...overrides,
		});

	describe('notification — own inbox', () => {
		it('GET /notification/my — unauthenticated', async () => {
			const { GET } = await import('@/app/api/notification/my/route');
			const result = await expectParity('/api/notification/my', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /notification/my — any authenticated role may read their own', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token, userId } = await createAuthedUser('tourist');
			await seedNotification(userId);

			const { GET } = await import('@/app/api/notification/my/route');
			const result = await expectParity('/api/notification/my', { token }, GET);

			expect(result.status).toBe(200);
			const body = result.body as { total: number; page: number; totalPages: number };
			expect(body.total).toBe(1);
			expect(body.page).toBe(1);
			expect(body.totalPages).toBe(1);
		});

		it('GET /notification/my — another account’s notifications are invisible', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			await seedNotification(theirs.userId);

			const { GET } = await import('@/app/api/notification/my/route');
			const result = await expectParity('/api/notification/my', { token: mine.token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { total: number }).total).toBe(0);
		});

		it('GET /notification/my?unreadOnly=false — "false" does not filter', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token, userId } = await createAuthedUser('tourist');
			await seedNotification(userId, { isRead: true });
			await seedNotification(userId, { isRead: false });

			const { GET } = await import('@/app/api/notification/my/route');
			const result = await expectParity('/api/notification/my?unreadOnly=false', { token }, GET);

			// z.coerce.boolean() would read the STRING "false" as true and hide the
			// read one. The schema preprocesses instead, which is why both are here.
			expect(result.status).toBe(200);
			expect((result.body as { total: number }).total).toBe(2);
		});

		it('GET /notification/my?unreadOnly=true — filters to unread', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token, userId } = await createAuthedUser('tourist');
			await seedNotification(userId, { isRead: true });
			await seedNotification(userId, { isRead: false });

			const { GET } = await import('@/app/api/notification/my/route');
			const result = await expectParity('/api/notification/my?unreadOnly=true', { token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { total: number }).total).toBe(1);
		});

		it('GET /notification/my?limit=101 — over the cap is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/notification/my/route');
			const result = await expectParity('/api/notification/my?limit=101', { token }, GET);

			expect(result.status).toBe(400);
		});

		it('GET /notification/my/unread-count', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token, userId } = await createAuthedUser('tourist');
			await seedNotification(userId, { isRead: false });
			await seedNotification(userId, { isRead: true });

			const { GET } = await import('@/app/api/notification/my/unread-count/route');
			const result = await expectParity('/api/notification/my/unread-count', { token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { count: number }).count).toBe(1);
		});

		it('GET /notification/my/unread-count — unauthenticated', async () => {
			const { GET } = await import('@/app/api/notification/my/unread-count/route');
			const result = await expectParity('/api/notification/my/unread-count', {}, GET);

			expect(result.status).toBe(401);
		});
	});

	describe('notification — marking read', () => {
		it('PATCH /notification/read-all — unauthenticated', async () => {
			const { PATCH } = await import('@/app/api/notification/read-all/route');
			const result = await expectParity(
				'/api/notification/read-all',
				{ method: 'PATCH' },
				PATCH
			);

			expect(result.status).toBe(401);
		});

		it('PATCH /notification/read-all — reports how many changed', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token, userId } = await createAuthedUser('tourist');
			await seedNotification(userId, { isRead: false });
			await seedNotification(userId, { isRead: false });

			const { PATCH } = await import('@/app/api/notification/read-all/route');
			const response = await PATCH(
				makeRequest('/api/notification/read-all', { token, method: 'PATCH' })
			);
			const result = await normalise(response);

			expect(result.status).toBe(200);
			expect((result.body as { modifiedCount: number }).modifiedCount).toBe(2);
			expect(await NotificationDB.countDocuments({ recipient: userId, isRead: false })).toBe(0);
		});

		it('PATCH /notification/:id/read — a malformed id is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { PATCH } = await import('@/app/api/notification/[id]/read/route');
			const result = await expectParity(
				'/api/notification/nope/read',
				{ token, method: 'PATCH' },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('PATCH /notification/:id/read — someone else’s notification is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const mine = await createAuthedUser('tourist');
			const theirs = await createAuthedUser('tourist');

			const notification = await seedNotification(theirs.userId);
			const id = notification._id.toString();

			// Not a 403: the update is scoped by recipient, so a notification that
			// isn't yours simply doesn't exist as far as this route is concerned.
			const { PATCH } = await import('@/app/api/notification/[id]/read/route');
			const result = await expectParity(
				`/api/notification/${id}/read`,
				{ token: mine.token, method: 'PATCH' },
				(request) => PATCH(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(404);
		});

		it('PATCH /notification/:id/read — marks the caller’s own read', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token, userId } = await createAuthedUser('tourist');

			const notification = await seedNotification(userId, { isRead: false });
			const id = notification._id.toString();

			const { PATCH } = await import('@/app/api/notification/[id]/read/route');
			const response = await PATCH(
				makeRequest(`/api/notification/${id}/read`, { token, method: 'PATCH' }),
				{ params: Promise.resolve({ id }) } as never
			);
			const result = await normalise(response);

			expect(result.status).toBe(200);
			expect((result.body as { isRead: boolean }).isRead).toBe(true);
		});
	});

	describe('notification — admin listing', () => {
		it('GET /notification — unauthenticated', async () => {
			const { GET } = await import('@/app/api/notification/route');
			const result = await expectParity('/api/notification', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /notification — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/notification/route');
			const result = await expectParity('/api/notification', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /notification — an admin sees everyone’s', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			const other = await createAuthedUser('tourist');
			await seedNotification(other.userId);

			const { GET } = await import('@/app/api/notification/route');
			const result = await expectParity('/api/notification', { token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { total: number }).total).toBe(1);
		});

		it('GET /notification?type= — filters by type', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			const other = await createAuthedUser('tourist');
			await seedNotification(other.userId, { type: 'booking_updated' });
			await seedNotification(other.userId, { type: 'payment_successful' });

			const { GET } = await import('@/app/api/notification/route');
			const result = await expectParity('/api/notification?type=payment_successful', { token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { total: number }).total).toBe(1);
		});

		it('GET /notification?page=0 — a non-positive page is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { GET } = await import('@/app/api/notification/route');
			const result = await expectParity('/api/notification?page=0', { token }, GET);

			expect(result.status).toBe(400);
		});
	});

	describe('message', () => {
		it('GET /message/threads — unauthenticated', async () => {
			const { GET } = await import('@/app/api/message/threads/route');
			const result = await expectParity('/api/message/threads', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /message/threads — an authenticated caller with no bookings', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/message/threads/route');
			const result = await expectParity('/api/message/threads', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /message/threads?limit=101 — over the cap is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/message/threads/route');
			const result = await expectParity('/api/message/threads?limit=101', { token }, GET);

			expect(result.status).toBe(400);
		});

		it('GET /message/unread-count — unauthenticated', async () => {
			const { GET } = await import('@/app/api/message/unread-count/route');
			const result = await expectParity('/api/message/unread-count', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /message/unread-count — authenticated', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/message/unread-count/route');
			const result = await expectParity('/api/message/unread-count', { token }, GET);

			expect(result.status).toBe(200);
		});

		it('GET /message/booking/:id — a malformed booking id is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/message/booking/[id]/route');
			const result = await expectParity('/api/message/booking/nope', { token }, (request) =>
				GET(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('GET /message/booking/:id — an unknown booking is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/message/booking/[id]/route');
			const result = await expectParity(
				`/api/message/booking/${KNOWN_MISSING_ID}`,
				{ token },
				(request) => GET(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});

		it('GET /message/booking/:id?after=notanid — the cursor is validated', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/message/booking/[id]/route');
			const result = await expectParity(
				`/api/message/booking/${KNOWN_MISSING_ID}?after=notanid`,
				{ token },
				(request) => GET(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			// The bad cursor is caught before the booking is looked up, so this is a
			// 400 rather than the 404 the same id gives without it.
			expect(result.status).toBe(400);
		});

		it('POST /message/booking/:id — an empty body is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/message/booking/[id]/route');
			const result = await expectParity(
				`/api/message/booking/${KNOWN_MISSING_ID}`,
				{ token, json: { body: '   ' } },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('POST /message/booking/:id — unauthenticated, before the body is read', async () => {
			const { POST } = await import('@/app/api/message/booking/[id]/route');
			const result = await expectParity(
				`/api/message/booking/${KNOWN_MISSING_ID}`,
				{ json: { body: 'hello' } },
				(request) => POST(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});

		it('PATCH /message/booking/:id/read — a malformed id is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { PATCH } = await import('@/app/api/message/booking/[id]/read/route');
			const result = await expectParity(
				'/api/message/booking/nope/read',
				{ token, method: 'PATCH' },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('PATCH /message/booking/:id/read — unauthenticated', async () => {
			const { PATCH } = await import('@/app/api/message/booking/[id]/read/route');
			const result = await expectParity(
				`/api/message/booking/${KNOWN_MISSING_ID}/read`,
				{ method: 'PATCH' },
				(request) => PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(401);
		});
	});
});
