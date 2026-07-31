/**
 * Shared harness for native-vs-Express parity tests.
 *
 * Phase 3 replaces Express routes with native Route Handlers one module at a
 * time. The risk is not a port that fails loudly — it is one that succeeds
 * *slightly differently*: a 400 where there was a 401, a lost cookie attribute,
 * a reworded message the frontend renders verbatim.
 *
 * So instead of asserting against hand-written expectations, these tests send
 * the SAME request through both implementations and require agreement. The
 * Express side is the code running in production today, which makes it the
 * reference: when a parity test passes, the port is behaviour-preserving by
 * construction rather than by someone's reading of it.
 */

export type Handler = (request: Request) => Promise<Response>;

export interface Normalised {
	status: number;
	body: unknown;
	cookies: Array<{ name: string; attrs: string[] }>;
	cacheControl: string | null;
}

export interface RequestSpec extends RequestInit {
	json?: unknown;
	token?: string;
}

/** Build a Request; a body implies POST unless a method is named. */
export function makeRequest(path: string, spec: RequestSpec = {}): Request {
	const { json, token, ...rest } = spec;
	const headers = new Headers(rest.headers);
	let body = rest.body;

	if (json !== undefined) {
		headers.set('content-type', 'application/json');
		body = JSON.stringify(json);
	}
	if (token) {
		headers.set('authorization', `Bearer ${token}`);
	}

	const method = rest.method ?? (body !== undefined ? 'POST' : 'GET');
	return new Request(`http://localhost${path}`, { ...rest, method, headers, body });
}

/**
 * Keys whose values are generated per-run and therefore cannot match across two
 * separately-seeded halves. Their PRESENCE is contract; their value is not.
 */
const VOLATILE_KEYS = new Set([
	'id',
	'_id',
	'createdAt',
	'updatedAt',
	'accountId',
	'token',
	'transaction_id',
	'expireAt',
]);

/** Recursively replace volatile values with a marker so the shapes can be compared. */
function maskVolatile(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(maskVolatile);

	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
			out[key] = VOLATILE_KEYS.has(key) ? `<${key}>` : maskVolatile(item);
		}
		return out;
	}

	return value;
}

/**
 * Reduce a Response to the parts that are contract.
 *
 * Cookie VALUES are freshly signed tokens and Expires is computed at call time,
 * so both are dropped; everything else about a cookie (name, HttpOnly, SameSite,
 * Path, Max-Age, Secure) is compared. ETag varies with framework rather than
 * behaviour and is ignored.
 */
export async function normalise(res: Response): Promise<Normalised> {
	const text = await res.text();
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		body = text;
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
		body: maskVolatile(body),
		cookies: cookies.sort((a, b) => a.name.localeCompare(b.name)),
		cacheControl: res.headers.get('cache-control'),
	};
}

/** The catch-all adapter's handler for a given method. */
async function expressHandlerFor(method: string): Promise<Handler> {
	const mod = await import('@/app/api/[...path]/route');
	const table: Record<string, Handler> = {
		GET: mod.GET,
		POST: mod.POST,
		PUT: mod.PUT,
		PATCH: mod.PATCH,
		DELETE: mod.DELETE,
		HEAD: mod.HEAD,
	};
	return table[method.toUpperCase()] ?? mod.GET;
}

export interface ParityOptions {
	/**
	 * Re-seed fixtures between the two halves when the route needs DB state.
	 *
	 * Use sparingly, and NEVER together with a bearer token: re-seeding mints a
	 * new account _id, which invalidates the token and makes the second half fail
	 * with "Account not available" — a harness artefact that looks exactly like a
	 * real parity failure. Generated ids are handled by maskVolatile() instead,
	 * so most cases need neither hook.
	 *
	 * Reach for these only where the first half's WRITES would change the second
	 * half's result (e.g. a create that must not run twice, or a rate-limit
	 * counter that must start fresh).
	 */
	reseed?: () => Promise<void>;
	/** Reset DB state between halves. Defaults to no reset. */
	reset?: () => Promise<void>;
}

/**
 * Send the same request through the native handler and the Express adapter and
 * assert they agree. Returns the native result for further assertions.
 */
export async function expectParity(
	path: string,
	spec: RequestSpec,
	native: Handler,
	options: ParityOptions = {}
): Promise<Normalised> {
	const method = spec.method ?? (spec.json !== undefined ? 'POST' : 'GET');

	const nativeResult = await normalise(await native(makeRequest(path, spec)));

	// A fresh Request per side: a body can only be consumed once.
	await options.reset?.();
	await options.reseed?.();

	const viaExpress = await expressHandlerFor(method);
	const expressResult = await normalise(await viaExpress(makeRequest(path, spec)));

	expect(nativeResult).toEqual(expressResult);

	return nativeResult;
}
