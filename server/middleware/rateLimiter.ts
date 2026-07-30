import { StorageDB } from '@mongo';
import { NextFunction, Request, Response } from 'express';
import { TooManyRequestsError } from 'node-be-utilities';

interface RateLimitOptions {
	prefix: string;
	windowSeconds: number;
	max: number;
	keyFn?: (req: Request) => string;
}

/**
 * Fixed-window rate limiter backed by StorageDB.
 * Use this to protect expensive/abuseable endpoints (OTP send, login, etc.).
 *
 * Note: StorageDB uses a document-per-key model. For very high traffic consider
 * swapping to Redis with INCR + EXPIRE — the interface here is intentionally
 * small so that swap is mechanical.
 */
export function rateLimit(options: RateLimitOptions) {
	const { prefix, windowSeconds, max, keyFn } = options;

	return async function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
		try {
			// req.ip is authoritative here: in production Express is configured with
			// `trust proxy` so it reflects the real client (from nginx's
			// X-Forwarded-For), and in dev it's the socket address. The raw
			// X-Forwarded-For header is intentionally NOT used as a fallback — it's
			// client-controlled and would let an attacker rotate it to evade limits.
			const identifier = keyFn?.(req) ?? req.ip ?? 'unknown';
			const key = `rl:${prefix}:${identifier}`;

			// One atomic round trip: increment and read back the new value.
			//
			// This was previously read → compare → find → save, which is a
			// check-then-act race. Requests arriving together all read the same
			// count, all saw it under the limit, and all passed — defeating the
			// limiter under exactly the concurrent-burst conditions it exists to
			// stop, and losing increments to overwrites on top of that.
			//
			// $inc on a missing document upserts it starting from 0, and
			// $setOnInsert fixes the window's expiry only on that first write, so
			// the window stays fixed rather than sliding forward on every hit.
			const record = await StorageDB.findOneAndUpdate(
				{ key },
				{
					$inc: { count: 1 },
					$setOnInsert: { expireAt: new Date(Date.now() + windowSeconds * 1000) },
				},
				{ upsert: true, new: true, setDefaultsOnInsert: false }
			);

			if ((record?.count ?? 0) > max) {
				return next(new TooManyRequestsError('Too many requests, please try again later'));
			}

			next();
		} catch (err) {
			next(err);
		}
	};
}

export default rateLimit;
