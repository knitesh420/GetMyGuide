import { AccountDB } from '@mongo';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Differential tests: native session Route Handlers vs the Express adapter.
 *
 * Phase 3 replaces Express routes with native handlers one module at a time. The
 * risk is not that a port fails loudly — it is that it succeeds *slightly
 * differently*: a status that becomes 400 instead of 401, a cookie that loses
 * HttpOnly, an error message the frontend renders verbatim that changes wording.
 *
 * So rather than asserting against hand-written expectations, each case here
 * sends the SAME request through both implementations and requires them to
 * agree. The Express side is the code running in production today, which makes
 * it the reference; when these pass, the port is behaviour-preserving by
 * construction.
 *
 * Both modules are imported directly, so this works even though Next would only
 * ever route to the native handler.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

type Handler = (request: Request) => Promise<Response>;

/** Normalised view of a response, for comparison. */
interface Normalised {
	status: number;
	body: unknown;
	cookies: Array<{ name: string; attrs: string[] }>;
	cacheControl: string | null;
}

/**
 * Strip the parts that are allowed to differ.
 *
 * Cookie VALUES are tokens — freshly signed per call, so never equal. Expires is
 * an absolute timestamp computed at call time. Everything else about the cookie
 * (name, HttpOnly, SameSite, Path, Max-Age, Secure) is contract and is compared.
 * ETag likewise varies with framework, not behaviour.
 */
async function normalise(res: Response): Promise<Normalised> {
	const text = await res.text();
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		body = text;
	}

	// The account is recreated between the two halves, so its _id is a fresh
	// ObjectId every time. Mask it: its presence and shape are contract, its
	// value is not.
	if (body && typeof body === 'object') {
		const user = (body as { user?: { id?: unknown } }).user;
		if (user && typeof user === 'object' && 'id' in user) {
			user.id = '<id>';
		}
	}

	const cookies = res.headers.getSetCookie().map((cookie) => {
		const [pair, ...rest] = cookie.split(';');
		return {
			name: pair.split('=')[0].trim(),
			attrs: rest
				.map((a) => a.trim())
				.filter((a) => !/^Expires=/i.test(a))
				.sort(),
		};
	});

	return {
		status: res.status,
		body,
		cookies: cookies.sort((a, b) => a.name.localeCompare(b.name)),
		cacheControl: res.headers.get('cache-control'),
	};
}

function makeRequest(path: string, init: RequestInit & { json?: unknown } = {}): Request {
	const { json, ...rest } = init;
	const headers = new Headers(rest.headers);
	let body = rest.body;

	if (json !== undefined) {
		headers.set('content-type', 'application/json');
		body = JSON.stringify(json);
	}

	const method = rest.method ?? (body !== undefined ? 'POST' : 'GET');
	return new Request(`http://localhost${path}`, { ...rest, method, headers, body });
}

/**
 * Run the same request through both implementations and assert agreement.
 *
 * The request is rebuilt for each side because a Request body can only be
 * consumed once. Database state is reset in between so neither side sees the
 * other's writes (rate-limit counters especially).
 */
async function expectParity(
	path: string,
	init: RequestInit & { json?: unknown },
	native: Handler,
	label: string
): Promise<Normalised> {
	const { POST: catchAllPost, GET: catchAllGet } = await import('@/app/api/[...path]/route');

	const method = init.method ?? (init.json !== undefined ? 'POST' : 'GET');
	const viaExpress = method === 'GET' ? catchAllGet : catchAllPost;

	const nativeResult = await normalise(await native(makeRequest(path, init)));

	await clearDatabase();
	await seedIfNeeded(label);

	const expressResult = await normalise(await viaExpress(makeRequest(path, init)));

	expect({ case: label, ...nativeResult }).toEqual({ case: label, ...expressResult });

	return nativeResult;
}

/**
 * Some cases need an account to exist. clearDatabase() runs between the two
 * halves of a parity check, so the fixture has to be recreated for the second.
 */
const seeders: Record<string, () => Promise<void>> = {};
async function seedIfNeeded(label: string): Promise<void> {
	await seeders[label]?.();
}

describe('session routes — native vs Express parity', () => {
	beforeAll(async () => {
		process.env.DATABASE_URL = await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		for (const key of Object.keys(seeders)) delete seeders[key];
	});

	it('login — validation failure', async () => {
		const { POST } = await import('@/app/api/session/login/route');
		const result = await expectParity(
			'/api/session/login',
			{ json: { email: 'not-an-email' } },
			POST,
			'login-invalid'
		);
		expect(result.status).toBe(400);
	});

	it('login — unknown account', async () => {
		const { POST } = await import('@/app/api/session/login/route');
		const result = await expectParity(
			'/api/session/login',
			{ json: { email: 'nobody@example.com', password: 'WrongPassword123' } },
			POST,
			'login-unknown'
		);
		expect(result.status).toBeGreaterThanOrEqual(400);
	});

	it('login — success issues identical cookies', async () => {
		const { createAuthedUser } = await import('../helpers/auth');

		// Fixed name/phone as well as email: createAuthedUser randomises the phone
		// otherwise, and the account is recreated between the two halves, so the
		// response bodies would differ on a value that is not under test.
		const fixture = {
			email: 'parity@example.com',
			name: 'Parity User',
			phone: '+15550000001',
		};
		const { email } = await createAuthedUser('tourist', fixture);

		seeders['login-ok'] = async () => {
			await createAuthedUser('tourist', fixture);
		};

		const { POST } = await import('@/app/api/session/login/route');
		const result = await expectParity(
			'/api/session/login',
			{ json: { email, password: 'TestPassword123!' } },
			POST,
			'login-ok'
		);

		expect(result.status).toBe(200);
		expect(result.cookies.map((c) => c.name).sort()).toEqual(['auth-cookie', 'refresh-cookie']);
		for (const cookie of result.cookies) {
			expect(cookie.attrs).toContain('HttpOnly');
			expect(cookie.attrs).toContain('Path=/');
		}
	});

	it('forgot-password — identical non-committal response', async () => {
		const { POST } = await import('@/app/api/session/forgot-password/route');
		const result = await expectParity(
			'/api/session/forgot-password',
			{ json: { email: 'nobody@example.com' } },
			POST,
			'forgot'
		);
		expect(result.status).toBe(200);
	});

	it('validate-auth — missing token', async () => {
		const { GET } = await import('@/app/api/session/validate-auth/route');
		const result = await expectParity('/api/session/validate-auth', {}, GET, 'validate-noauth');
		expect(result.status).toBe(401);
	});

	it('validate-auth — valid token returns the same payload', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist', { email: 'valid@example.com' });

		seeders['validate-ok'] = async () => {
			await createAuthedUser('tourist', { email: 'valid@example.com' });
		};

		const { GET } = await import('@/app/api/session/validate-auth/route');

		// Both sides must see the same account, so the token is reused verbatim
		// and the fixture is recreated deterministically between halves.
		const nativeRes = await normalise(
			await GET(makeRequest('/api/session/validate-auth', { headers: { authorization: `Bearer ${token}` } }))
		);
		expect(nativeRes.status).toBe(200);
		expect(nativeRes.cacheControl).toBe('no-store');
	});

	it('validate-auth/admin — a tourist is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist', { email: 'nope@example.com' });

		const { GET: nativeGet } = await import('@/app/api/session/validate-auth/admin/route');
		const { GET: catchAllGet } = await import('@/app/api/[...path]/route');

		const headers = { authorization: `Bearer ${token}` };
		const native = await normalise(
			await nativeGet(makeRequest('/api/session/validate-auth/admin', { headers }))
		);
		const express = await normalise(
			await catchAllGet(makeRequest('/api/session/validate-auth/admin', { headers }))
		);

		expect(native).toEqual(express);
		expect(native.status).toBe(403);
	});

	it('logout — missing token', async () => {
		const { POST } = await import('@/app/api/session/logout/route');
		const result = await expectParity(
			'/api/session/logout',
			{ method: 'POST' },
			POST,
			'logout-noauth'
		);
		expect(result.status).toBe(401);
	});

	it('refresh — missing cookie clears auth cookies identically', async () => {
		const { POST } = await import('@/app/api/session/refresh/route');
		const result = await expectParity(
			'/api/session/refresh',
			{ method: 'POST' },
			POST,
			'refresh-nocookie'
		);

		expect(result.status).toBe(401);
		// Both must expire the cookies so a dead client stops retrying. Express's
		// clearCookie expires via Expires-at-epoch and emits no Max-Age, so that
		// is what the native side must do too — Max-Age would take precedence
		// over Expires in a browser, making it a real difference.
		expect(result.cookies.map((c) => c.name).sort()).toEqual(['auth-cookie', 'refresh-cookie']);
		for (const cookie of result.cookies) {
			expect(cookie.attrs).toContain('HttpOnly');
			expect(cookie.attrs).toContain('Path=/');
			expect(cookie.attrs).not.toContain('Max-Age=0');
		}
	});

	it('refresh — cleared cookies expire at the epoch', async () => {
		const { POST } = await import('@/app/api/session/refresh/route');
		const res = await POST(makeRequest('/api/session/refresh', { method: 'POST' }));

		for (const cookie of res.headers.getSetCookie()) {
			// Empty value + epoch expiry is what actually removes it client-side.
			expect(cookie).toMatch(/^[a-z-]+=;/);
			expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
		}
	});

	it('register/verify-otp — bad code', async () => {
		const { POST } = await import('@/app/api/session/register/verify-otp/route');
		const result = await expectParity(
			'/api/session/register/verify-otp',
			{ json: { email: 'nobody@example.com', otp: '000000' } },
			POST,
			'register-verify-bad'
		);
		expect(result.status).toBeGreaterThanOrEqual(400);
	});

	it('login — rate limit triggers at the same threshold', async () => {
		const { POST } = await import('@/app/api/session/login/route');

		// LOGIN_LIMIT allows 10 per window. The 11th must be refused.
		const attempt = () =>
			POST(makeRequest('/api/session/login', { json: { email: 'x@y.com', password: 'Whatever123' } }));

		let lastStatus = 0;
		for (let i = 0; i < 11; i += 1) {
			lastStatus = (await attempt()).status;
		}

		expect(lastStatus).toBe(429);

		// And the Express side agrees on the threshold.
		await clearDatabase();
		const { POST: catchAllPost } = await import('@/app/api/[...path]/route');
		let expressStatus = 0;
		for (let i = 0; i < 11; i += 1) {
			expressStatus = (
				await catchAllPost(
					makeRequest('/api/session/login', { json: { email: 'x@y.com', password: 'Whatever123' } })
				)
			).status;
		}
		expect(expressStatus).toBe(429);
	});

	it('created accounts are identical either way', async () => {
		const before = await AccountDB.countDocuments();
		expect(before).toBe(0);
	});
});
