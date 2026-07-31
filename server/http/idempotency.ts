import IdempotencyKeyDB from '@mongo/repo/IdempotencyKey';
import crypto from 'crypto';
import { BadRequestError } from 'node-be-utilities';

import { clientIp } from './rate-limit';

/**
 * Next-native port of `server/middleware/idempotency.ts`.
 *
 * Guards duplicate payment-related requests. Two properties matter and are
 * preserved exactly:
 *
 * 1. The key is scoped to the CALLER. Looking it up as `{ key, endpoint }`
 *    alone means any client that guesses or collides with another user's key is
 *    handed back that user's stored response — which for the order endpoints
 *    contains their name, email, phone and Razorpay order id.
 *
 * 2. The key is reserved BEFORE the handler runs, not after it replies. The
 *    unique index on { key, endpoint } is the serialisation point: exactly one
 *    concurrent request wins and proceeds, every other lands in the duplicate
 *    branch. Writing the record after the handler replied would let two
 *    simultaneous requests both miss the lookup and both execute — the exact
 *    double-charge this exists to prevent.
 */

const KEY_FORMAT = /^[A-Za-z0-9_.:-]{8,128}$/;

/**
 * Endpoint identity for the key.
 *
 * Express used `req.originalUrl`, which for these routes is '/guide/…' — the
 * router is mounted at '/'. The native handler sees '/api/guide/…'. Strip the
 * prefix so a key reserved under one implementation still matches under the
 * other; otherwise rolling a route back to the adapter would silently reset
 * every in-flight idempotency key.
 */
function endpointFor(request: Request): string {
	const path = new URL(request.url).pathname.replace(/^\/api/, '');
	return `${request.method}:${path}`;
}

/**
 * Run `handler` under idempotency protection.
 *
 * `body` must be the already-parsed request body — the hash is taken over it
 * exactly as Express hashed `req.body`, so a retry with a different payload is
 * still rejected.
 */
export async function withIdempotency(
	request: Request,
	userId: string | undefined,
	body: unknown,
	handler: () => Promise<Response>
): Promise<Response> {
	const idempotencyKey = request.headers.get('x-idempotency-key') ?? undefined;

	if (!idempotencyKey) {
		throw new BadRequestError('x-idempotency-key header is required');
	}

	if (!KEY_FORMAT.test(idempotencyKey)) {
		throw new BadRequestError(
			'x-idempotency-key must be 8-128 characters of letters, digits, dot, colon, dash or underscore'
		);
	}

	// Bind the key to whoever is calling. Falling back to the IP keeps the
	// unauthenticated guest paths working without letting them share a namespace
	// with signed-in users.
	const caller = userId ?? `ip:${clientIp(request)}`;
	const key = `${caller}:${idempotencyKey}`;
	const endpoint = endpointFor(request);
	const requestHash = crypto
		.createHash('sha256')
		.update(JSON.stringify(body || {}))
		.digest('hex');

	try {
		await IdempotencyKeyDB.create({ key, endpoint, requestHash });
	} catch (err) {
		if ((err as { code?: number })?.code !== 11000) {
			throw err;
		}

		const existing = await IdempotencyKeyDB.findOne({ key, endpoint });
		if (!existing) {
			throw new BadRequestError('Idempotency key conflict; please retry');
		}

		if (existing.requestHash !== requestHash) {
			throw new BadRequestError('Idempotency key already used with a different request body');
		}

		// Won the race but the original is still running — nothing to replay yet.
		if (!existing.response) {
			throw new BadRequestError('An identical request is still in progress; please retry shortly');
		}

		return Response.json(existing.response.body, { status: existing.response.statusCode });
	}

	// Reservation held. Capture the response so a later retry can replay it.
	let response: Response;
	try {
		response = await handler();
	} catch (err) {
		// The handler blew up: release the key so the client can retry with it.
		await IdempotencyKeyDB.deleteOne({ key, endpoint }).catch(() => {});
		throw err;
	}

	// Read the body without consuming the caller's copy.
	const snapshot = response.clone();

	if (response.status >= 200 && response.status < 300) {
		try {
			const stored = await snapshot.json();
			await IdempotencyKeyDB.updateOne(
				{ key, endpoint },
				{ response: { statusCode: response.status, body: stored } }
			);
		} catch {
			// Best-effort: the reservation already did the deduplication work.
		}
	} else {
		// A failed attempt must not burn the key — the client is expected to
		// retry with the same one.
		await IdempotencyKeyDB.deleteOne({ key, endpoint }).catch(() => {});
	}

	return response;
}
