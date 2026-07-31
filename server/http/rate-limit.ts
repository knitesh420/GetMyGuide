import { StorageDB } from '@mongo';
import { TooManyRequestsError } from 'node-be-utilities';

/**
 * Next-native port of `server/middleware/rateLimiter.ts`.
 *
 * The storage strategy is unchanged and deliberately so: a fixed window in
 * Mongo, incremented with a single atomic `$inc` + `$setOnInsert` upsert. That
 * one round trip is what makes it correct under concurrent bursts (a
 * read-compare-write would let simultaneous requests all read the same count and
 * all pass), and being in the database rather than in memory is what makes it
 * work at all across serverless instances, which share no process state.
 */

interface RateLimitOptions {
	prefix: string;
	windowSeconds: number;
	max: number;
}

/**
 * Client IP.
 *
 * On Vercel there is always exactly one proxy hop, so the left-most
 * x-forwarded-for entry is the real client. The header is client-settable in
 * principle, but Vercel overwrites it at the edge, so it is authoritative here
 * in the same way `req.ip` was behind nginx.
 */
export function clientIp(request: Request): string {
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) {
		const first = forwarded.split(',')[0]?.trim();
		if (first) return first;
	}
	return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Consume one unit from the caller's bucket. Throws TooManyRequestsError when
 * the window's allowance is exhausted.
 *
 * `identifier` defaults to the client IP; pass e.g. `${ip}:${email}` for
 * endpoints that must not let an attacker exhaust a victim's quota by rotating
 * IPs (and vice-versa) — that is why OTP endpoints key on both.
 */
export async function enforceRateLimit(
	{ prefix, windowSeconds, max }: RateLimitOptions,
	identifier: string
): Promise<void> {
	const key = `rl:${prefix}:${identifier}`;

	const record = await StorageDB.findOneAndUpdate(
		{ key },
		{
			$inc: { count: 1 },
			$setOnInsert: { expireAt: new Date(Date.now() + windowSeconds * 1000) },
		},
		{ upsert: true, new: true, setDefaultsOnInsert: false }
	);

	if ((record?.count ?? 0) > max) {
		throw new TooManyRequestsError('Too many requests, please try again later');
	}
}
