import IdempotencyKeyDB from '@mongo/repo/IdempotencyKey';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';

/**
 * Idempotency middleware — prevents duplicate payment-related requests.
 *
 * Reads `x-idempotency-key` from headers.
 * - If key+endpoint already exists with matching request hash → returns stored response.
 * - If not → reserves the key, lets the request through, and stores the response.
 *
 * Two properties this has to get right:
 *
 * 1. The key is scoped to the caller. It used to be looked up as
 *    `{ key, endpoint }` alone, so any client that guessed or collided with
 *    another user's key was handed back that user's stored response body —
 *    which for the order endpoints contains their name, email, phone and
 *    Razorpay order id.
 *
 * 2. The key is reserved BEFORE the handler runs, not after it replies. The
 *    previous version wrote the record from inside a patched `res.json`, so two
 *    simultaneous requests both missed the lookup and both executed — the exact
 *    double-charge this middleware exists to prevent.
 */
const KEY_FORMAT = /^[A-Za-z0-9_.:-]{8,128}$/;

export default async function idempotency(req: Request, res: Response, next: NextFunction) {
	const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

	if (!idempotencyKey) {
		return next(new BadRequestError('x-idempotency-key header is required'));
	}

	if (!KEY_FORMAT.test(idempotencyKey)) {
		return next(
			new BadRequestError(
				'x-idempotency-key must be 8-128 characters of letters, digits, dot, colon, dash or underscore'
			)
		);
	}

	// Bind the key to whoever is calling. Falling back to the IP keeps the
	// unauthenticated guest-booking path working without letting it share a
	// namespace with signed-in users.
	const caller = req.locals?.user?.userId ?? `ip:${req.ip ?? 'unknown'}`;
	const key = `${caller}:${idempotencyKey}`;
	const endpoint = `${req.method}:${req.originalUrl}`;
	const requestHash = crypto
		.createHash('sha256')
		.update(JSON.stringify(req.body || {}))
		.digest('hex');

	try {
		// Reserve first. The unique index on { key, endpoint } makes this the
		// serialisation point: exactly one concurrent request wins and proceeds,
		// every other one lands in the duplicate branch below.
		await IdempotencyKeyDB.create({ key, endpoint, requestHash });
	} catch (err: any) {
		if (err?.code !== 11000) {
			return next(err);
		}

		const existing = await IdempotencyKeyDB.findOne({ key, endpoint });
		if (!existing) {
			return next(new BadRequestError('Idempotency key conflict; please retry'));
		}

		if (existing.requestHash !== requestHash) {
			return next(
				new BadRequestError('Idempotency key already used with a different request body')
			);
		}

		// Won the race but the original is still running — no response to replay yet.
		if (!existing.response) {
			return next(
				new BadRequestError('An identical request is still in progress; please retry shortly')
			);
		}

		return res.status(existing.response.statusCode).json(existing.response.body);
	}

	// Reservation held. Capture the response so a later retry can replay it.
	const originalJson = res.json.bind(res);

	res.json = function (body: any) {
		const statusCode = res.statusCode;

		if (statusCode >= 200 && statusCode < 300) {
			IdempotencyKeyDB.updateOne({ key, endpoint }, { response: { statusCode, body } }).catch(
				() => {
					// Best-effort: the reservation already did the deduplication work.
				}
			);
		} else {
			// A failed attempt must not burn the key — the client is expected to
			// retry with the same one.
			IdempotencyKeyDB.deleteOne({ key, endpoint }).catch(() => {});
		}

		return originalJson(body);
	};

	return next();
}
