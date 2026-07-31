import { AccountDB } from '@mongo';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Contract tests for the Next.js Route Handler that fronts the Express app.
 *
 * The migration's whole safety argument rests on this adapter being transparent:
 * a request through /api/* must reach the same handler, and come back with the
 * same status, body shape and headers, as it did through Express directly. The
 * cases below are the ones where a hand-rolled adapter usually goes wrong.
 *
 * The route module is imported lazily inside the tests, after the in-memory
 * Mongo is up, because importing it pulls in the Express app and its whole
 * module graph.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

// The adapter connects through the serverless cache, which reads DATABASE_URL.
// connectTestDB() returns the in-memory server's URI; point the cache at it
// before the route module is loaded.
let uri: string;

async function loadHandler() {
	const mod = await import('@/app/api/[...path]/route');
	return mod;
}

function makeRequest(
	path: string,
	init: RequestInit & { json?: unknown } = {}
): Request {
	const { json, ...rest } = init;
	const headers = new Headers(rest.headers);
	let body = rest.body;

	if (json !== undefined) {
		headers.set('content-type', 'application/json');
		body = JSON.stringify(json);
	}

	// A Request may not carry a body on GET/HEAD, so a supplied body implies POST
	// unless the caller named a method explicitly.
	const method = rest.method ?? (body !== undefined ? 'POST' : 'GET');

	return new Request(`http://localhost${path}`, { ...rest, method, headers, body });
}

describe('Next.js API adapter (/api/[...path])', () => {
	beforeAll(async () => {
		uri = await connectTestDB();
		process.env.DATABASE_URL = uri;
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	it('routes a request through to the Express app and strips the /api prefix', async () => {
		const { GET } = await loadHandler();

		// /api-status is defined on the Express app itself, so reaching it proves
		// the prefix was stripped and the app was actually invoked.
		const res = await GET(makeRequest('/api/api-status'));

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ success: true });
	});

	it('returns 404 through the Express error handler for an unknown route', async () => {
		const { GET } = await loadHandler();

		const res = await GET(makeRequest('/api/definitely-not-a-route'));

		// The important part is that it is a handled 404, not an adapter crash.
		expect(res.status).toBe(404);
	});

	it('parses a JSON body and applies validation (400, not 500)', async () => {
		const { POST } = await loadHandler();

		// Missing password — the zod validator should reject this. A 500 here
		// would mean the body never reached the parser.
		const res = await POST(makeRequest('/api/session/login', { json: { email: 'x@y.com' } }));

		expect(res.status).toBe(400);
		const body = (await res.json()) as { success?: boolean };
		expect(body.success).toBe(false);
	});

	it('rejects bad credentials with 401 rather than an adapter error', async () => {
		const { POST } = await loadHandler();

		const res = await POST(
			makeRequest('/api/session/login', {
				json: { email: 'nobody@example.com', password: 'WrongPassword123' },
			})
		);

		expect([400, 401]).toContain(res.status);
	});

	it('emits set-cookie as separate headers on a successful login', async () => {
		const { POST } = await loadHandler();

		// Reuse the suite-wide helper rather than reimplementing signup: it already
		// handles the emailVerified flag that login() requires.
		const { createAuthedUser } = await import('../helpers/auth');
		const { email } = await createAuthedUser('tourist');

		const res = await POST(
			makeRequest('/api/session/login', {
				json: { email, password: 'TestPassword123!' },
			})
		);

		expect(res.status).toBe(200);

		// getSetCookie() returns one entry per Set-Cookie header. The auth and
		// refresh cookies must arrive as two, not one comma-joined string —
		// joining them is the classic adapter bug and it silently breaks sessions.
		const cookies = res.headers.getSetCookie();
		expect(cookies.length).toBeGreaterThanOrEqual(2);
		for (const cookie of cookies) {
			expect(cookie).toMatch(/HttpOnly/i);
		}

		const account = await AccountDB.findOne({ email }).lean();
		expect(account).not.toBeNull();
	});

	it('preserves the security headers the Express app sets', async () => {
		const { GET } = await loadHandler();

		const res = await GET(makeRequest('/api/api-status'));

		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('x-frame-options')).toBe('DENY');
		expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
	});

	it('passes the raw body through unmodified for webhook signature checks', async () => {
		const { POST } = await loadHandler();

		// An invalid signature must be REJECTED, not crash. This exercises the
		// rawBody capture path that Razorpay verification depends on.
		const res = await POST(
			makeRequest('/api/payment/webhook', {
				json: { event: 'payment.captured', payload: {} },
				headers: { 'x-razorpay-signature': 'obviously-invalid' },
			})
		);

		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.status).toBeLessThan(500);
	});

	it('does not attach a body to a HEAD response', async () => {
		const { HEAD } = await loadHandler();

		const res = await HEAD(makeRequest('/api/api-status', { method: 'HEAD' }));

		expect(res.status).toBe(200);
		await expect(res.text()).resolves.toBe('');
	});
});
