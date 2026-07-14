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

			const currentRaw = await StorageDB.getString(key);
			const current = currentRaw ? parseInt(currentRaw, 10) : 0;

			if (current >= max) {
				return next(new TooManyRequestsError('Too many requests, please try again later'));
			}

			// Increment counter. First write also sets TTL via schema default.
			// To respect windowSeconds, explicitly set an expireAt when first created.
			const next_count = current + 1;
			const existing = await StorageDB.findOne({ key });
			if (!existing) {
				await StorageDB.create({
					key,
					value: String(next_count),
					expireAt: new Date(Date.now() + windowSeconds * 1000),
				});
			} else {
				existing.value = String(next_count);
				await existing.save();
			}

			next();
		} catch (err) {
			next(err);
		}
	};
}

export default rateLimit;
