/**
 * Next-native equivalents of the Express `Respond()` helper and the
 * node-be-utilities `errorHandler` middleware.
 *
 * These MUST serialise identically to the Express versions. The frontend's
 * `lib/service/api.ts` unwrap() reverse-engineers the envelope that
 * node-be-utilities produces — it depends on the payload being *spread* onto the
 * response root rather than nested under `data`, and it special-cases the shapes
 * that spreading produces. A well-intentioned "cleaner" envelope here would not
 * throw; it would silently resolve fields to `undefined` across ~40 call sites.
 *
 * The exact shapes below were captured from live responses through the running
 * Express app, not inferred from the source:
 *
 *   success  {"<payload keys spread>","success":true}
 *   error    {"success":false,"status":"error","title":"UNAUTHORIZED",
 *             "message":"...","error":{"title":"...","message":"...","status":401}}
 */

/** Error classes from node-be-utilities all expose this. */
interface SerializableError {
	status: number;
	title: string;
	message: string;
	serializeError(): { title: string; message: string; status: number };
}

function isSerializableError(err: unknown): err is SerializableError {
	return (
		typeof err === 'object' &&
		err !== null &&
		typeof (err as SerializableError).serializeError === 'function'
	);
}

/**
 * Flatten a Mongoose document before spreading.
 *
 * Spreading a Mongoose document does not copy its fields — a document's own
 * enumerable properties are its internals, so `{ ...doc }` yields
 * `{ $__, _doc }` and every real field is left on the prototype. This mirrors
 * `server/utils/respond.ts`, which exists for exactly this reason.
 */
function toPlain(data: unknown): unknown {
	if (data === null || typeof data !== 'object') return data;

	if (typeof (data as { toJSON?: unknown }).toJSON === 'function') {
		return (data as { toJSON: () => unknown }).toJSON();
	}

	if (Array.isArray(data)) return data.map(toPlain);

	return data;
}

/** Headers the Express app sets on every response; kept identical here. */
export const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-DNS-Prefetch-Control': 'off',
	'Content-Security-Policy':
		"default-src 'none'; img-src 'self' data:; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};

function withSecurityHeaders(headers: Headers): Headers {
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		headers.set(key, value);
	}
	if (process.env.NODE_ENV === 'production') {
		headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
	}
	return headers;
}

/**
 * Success response. Spreads the payload onto the root and appends
 * `success: true`, exactly as node-be-utilities' Respond does.
 */
export function respond({
	status = 200,
	data,
	headers,
}: {
	status?: number;
	data?: unknown;
	headers?: Headers;
}): Response {
	const plain = toPlain(data);
	const body =
		plain !== null && typeof plain === 'object'
			? { ...(plain as Record<string, unknown>), success: true }
			: { success: true };

	const responseHeaders = withSecurityHeaders(headers ?? new Headers());
	responseHeaders.set('Content-Type', 'application/json; charset=utf-8');

	return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

/**
 * Error response. Reproduces node-be-utilities' errorHandler, including the
 * duplicated title/message at the root and inside `error`.
 *
 * Unknown errors become a 500 with a generic message — never leak an internal
 * message or stack to the client.
 */
export function respondError(err: unknown, headers?: Headers): Response {
	const responseHeaders = withSecurityHeaders(headers ?? new Headers());
	responseHeaders.set('Content-Type', 'application/json; charset=utf-8');

	if (isSerializableError(err)) {
		const serialized = err.serializeError();
		return new Response(
			JSON.stringify({
				success: false,
				status: 'error',
				title: serialized.title,
				message: serialized.message,
				error: serialized,
			}),
			{ status: serialized.status, headers: responseHeaders }
		);
	}

	// eslint-disable-next-line no-console
	console.error('Unhandled error in route handler', err);

	const serialized = {
		title: 'INTERNAL_SERVER_ERROR',
		message: 'Internal Server Error',
		status: 500,
	};

	return new Response(
		JSON.stringify({
			success: false,
			status: 'error',
			title: serialized.title,
			message: serialized.message,
			error: serialized,
		}),
		{ status: 500, headers: responseHeaders }
	);
}
