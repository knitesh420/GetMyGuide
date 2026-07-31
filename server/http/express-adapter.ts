import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import { Readable } from 'stream';

/**
 * Runs an Express application inside a Next.js Route Handler.
 *
 * Next hands us a Web `Request` and wants a Web `Response`; Express speaks
 * Node's `IncomingMessage`/`ServerResponse`. This module is the translation
 * layer between the two, and it exists so the migration does not have to
 * hand-port 178 endpoints in one step. Every route, middleware, validator and
 * controller keeps running exactly the code that runs in production today.
 *
 * It is a stepping stone, not the destination — routes get peeled off into
 * native handlers module by module, and this shrinks to nothing.
 *
 * Two details that are easy to get wrong and expensive to debug:
 *
 *   - The body is read ONCE, up front, into a Buffer. Express's json parser
 *     also stashes it on `req.rawBody` for Razorpay webhook signature
 *     verification, which is checked against the exact bytes received. Anything
 *     that re-encodes on the way through breaks payment webhooks silently.
 *
 *   - `set-cookie` must be emitted as repeated headers, never joined into one
 *     comma-separated value. Node's getHeaders() returns them as an array;
 *     Headers.append() per element is what keeps auth and refresh cookies as two
 *     distinct cookies rather than one malformed one.
 */

type ExpressLike = (req: IncomingMessage, res: ServerResponse) => void;

/** Node's ServerResponse with the bits we add to capture output. */
interface CapturingResponse extends ServerResponse {
	__chunks: Buffer[];
}

function toBuffer(chunk: unknown): Buffer {
	if (Buffer.isBuffer(chunk)) return chunk;
	if (typeof chunk === 'string') return Buffer.from(chunk);
	if (chunk instanceof Uint8Array) return Buffer.from(chunk);
	return Buffer.alloc(0);
}

/**
 * Build a Node-style request from a Web Request.
 *
 * `pathPrefix` is stripped before Express sees the URL: the browser calls
 * /api/session/login, but the Express router is mounted at '/' and knows the
 * route as /session/login.
 */
function buildNodeRequest(request: Request, body: Buffer, pathPrefix: string): IncomingMessage {
	const url = new URL(request.url);

	let path = url.pathname;
	if (pathPrefix && path.startsWith(pathPrefix)) {
		path = path.slice(pathPrefix.length) || '/';
	}
	if (!path.startsWith('/')) path = `/${path}`;

	// A Readable carrying the body, dressed up as an IncomingMessage. Express
	// only needs the stream contract plus the metadata fields below.
	const stream = Readable.from(body.length > 0 ? [body] : []);
	const req = stream as unknown as IncomingMessage & { rawBody?: Buffer };

	req.method = request.method;
	req.url = path + url.search;
	req.httpVersion = '1.1';
	req.httpVersionMajor = 1;
	req.httpVersionMinor = 1;

	const headers: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		headers[key.toLowerCase()] = value;
	});

	// body-parser decides whether to read a body at all via typeis.hasBody(),
	// which is satisfied only by a content-length or transfer-encoding header. A
	// Web Request does not surface content-length, so without this the parser
	// takes the "skip empty body" branch, leaves req.body undefined, and every
	// validator in the app rejects with "expected object, received undefined" —
	// i.e. every POST/PUT/PATCH 400s while looking like a validation bug.
	//
	// Set it from the bytes we actually hold, and drop any inherited
	// transfer-encoding: the body is already fully buffered, so claiming it is
	// chunked would make raw-body wait for a stream that has ended.
	delete headers['transfer-encoding'];
	if (body.length > 0) {
		headers['content-length'] = String(body.length);
	} else {
		delete headers['content-length'];
	}

	req.headers = headers;
	req.headersDistinct = {} as IncomingMessage['headersDistinct'];
	req.rawHeaders = Object.entries(headers).flat();

	// Some middleware reads req.socket.remoteAddress. Express's `trust proxy`
	// prefers x-forwarded-for when set (Vercel always sets it), so this is only a
	// fallback — but it must exist or the rate limiter throws on req.ip.
	const socket = new Socket();
	Object.defineProperty(socket, 'remoteAddress', {
		value: headers['x-forwarded-for']?.split(',')[0]?.trim() ?? '127.0.0.1',
		writable: false,
	});
	Object.defineProperty(req, 'socket', { value: socket, writable: false });
	Object.defineProperty(req, 'connection', { value: socket, writable: false });

	return req;
}

/**
 * Drive the Express app and collect everything it writes.
 *
 * Resolves when the response ends. Rejects only if Express itself throws
 * synchronously — route-level errors are already turned into responses by the
 * app's own error handler, and must stay that way so error shapes match
 * production byte-for-byte.
 */
function runExpress(app: ExpressLike, req: IncomingMessage): Promise<CapturingResponse> {
	return new Promise((resolve, reject) => {
		const res = new ServerResponse(req) as CapturingResponse;
		res.__chunks = [];

		const originalWrite = res.write.bind(res);
		const originalEnd = res.end.bind(res);

		// Capture rather than socket-write. ServerResponse without an assigned
		// socket would otherwise buffer raw HTTP bytes (status line + headers +
		// body) that we'd have to parse back out.
		res.write = function (chunk: unknown, ...rest: unknown[]): boolean {
			if (chunk) res.__chunks.push(toBuffer(chunk));
			const callback = rest.find((arg) => typeof arg === 'function') as
				| (() => void)
				| undefined;
			callback?.();
			return true;
		} as typeof res.write;

		res.end = function (chunk?: unknown, ...rest: unknown[]): CapturingResponse {
			if (chunk && typeof chunk !== 'function') res.__chunks.push(toBuffer(chunk));
			const callback = [chunk, ...rest].find((arg) => typeof arg === 'function') as
				| (() => void)
				| undefined;
			callback?.();
			res.emit('finish');
			resolve(res);
			return res;
		} as unknown as typeof res.end;

		// Restore the originals if anything ever needs the real implementations.
		Object.defineProperty(res, '__originalWrite', { value: originalWrite });
		Object.defineProperty(res, '__originalEnd', { value: originalEnd });

		try {
			app(req, res);
		} catch (err) {
			reject(err);
		}
	});
}

/** Turn Node's captured headers into Web Headers, preserving repeated set-cookie. */
function buildWebHeaders(res: CapturingResponse): Headers {
	const headers = new Headers();

	for (const [key, value] of Object.entries(res.getHeaders())) {
		if (value === undefined) continue;

		if (Array.isArray(value)) {
			// set-cookie is the case that matters: two cookies must stay two
			// headers. Joining them produces one cookie whose value contains the
			// other's attributes, and the session silently fails to establish.
			for (const item of value) headers.append(key, String(item));
			continue;
		}

		headers.set(key, String(value));
	}

	return headers;
}

/**
 * Adapt a Web Request to an Express app and return a Web Response.
 *
 * @param app        the configured Express application
 * @param request    the incoming Web Request from the Route Handler
 * @param pathPrefix URL prefix to strip before Express routing (e.g. '/api')
 */
export async function handleWithExpress(
	app: ExpressLike,
	request: Request,
	pathPrefix = '/api'
): Promise<Response> {
	// Read the body once, as bytes. GET/HEAD carry none.
	const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
	const body = hasBody ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);

	const req = buildNodeRequest(request, body, pathPrefix);
	const res = await runExpress(app, req);

	const payload = Buffer.concat(res.__chunks);
	const headers = buildWebHeaders(res);

	// content-length from Node can disagree with what we actually captured (for
	// example when a stream was piped). Let the platform set it.
	headers.delete('content-length');
	headers.delete('transfer-encoding');

	// 204/304 must not carry a body.
	const status = res.statusCode || 200;
	const bodyless = status === 204 || status === 304 || request.method === 'HEAD';

	return new Response(bodyless ? null : new Uint8Array(payload), {
		status,
		statusText: res.statusMessage || undefined,
		headers,
	});
}

export default handleWithExpress;
