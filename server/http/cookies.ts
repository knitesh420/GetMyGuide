import {
	ACCESS_COOKIE_MAX_AGE_MS,
	Cookie,
	COOKIE_DOMAIN,
	COOKIE_SAMESITE,
	IS_PRODUCTION,
	REFRESH_COOKIE_MAX_AGE_MS,
} from '@config/const';

/**
 * Auth cookie serialisation, matching Express's `res.cookie()` output.
 *
 * Attribute set and order follow what the Express controller produced, because
 * the browser-visible cookie must not change across the migration — a
 * difference in Path, Domain or SameSite silently logs everyone out or, worse,
 * widens the cookie's scope.
 *
 * Express emits Max-Age in SECONDS (it divides the millisecond option by 1000)
 * and also sets an absolute Expires. Both are reproduced here.
 */

function serialize(
	name: string,
	value: string,
	maxAgeMs: number
): string {
	const parts = [`${name}=${encodeURIComponent(value)}`];

	parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
	if (COOKIE_DOMAIN) parts.push(`Domain=${COOKIE_DOMAIN}`);
	parts.push('Path=/');
	parts.push(`Expires=${new Date(Date.now() + maxAgeMs).toUTCString()}`);
	parts.push('HttpOnly');
	// secure is gated on production so local http:// development still works —
	// same condition the Express controller used.
	if (IS_PRODUCTION) parts.push('Secure');
	parts.push(`SameSite=${COOKIE_SAMESITE.charAt(0).toUpperCase()}${COOKIE_SAMESITE.slice(1)}`);

	return parts.join('; ');
}

/** Append both auth cookies to the given headers. */
export function setAuthCookies(headers: Headers, accessToken: string, refreshToken: string): Headers {
	// append(), never set() — two cookies must be two Set-Cookie headers.
	headers.append('Set-Cookie', serialize(Cookie.Auth, accessToken, ACCESS_COOKIE_MAX_AGE_MS));
	headers.append('Set-Cookie', serialize(Cookie.Refresh, refreshToken, REFRESH_COOKIE_MAX_AGE_MS));
	return headers;
}

/**
 * Expire both auth cookies. Mirrors Express's res.clearCookie().
 *
 * Note there is deliberately NO Max-Age here. Express's clearCookie expires a
 * cookie with `Expires` at the epoch and emits no Max-Age at all, and Max-Age
 * takes precedence over Expires in browsers — so adding one would be a real
 * behavioural difference, not a cosmetic one. Verified against live output from
 * the Express app.
 */
export function clearAuthCookies(headers: Headers): Headers {
	for (const name of [Cookie.Auth, Cookie.Refresh]) {
		const parts = [`${name}=`];
		if (COOKIE_DOMAIN) parts.push(`Domain=${COOKIE_DOMAIN}`);
		parts.push('Path=/');
		parts.push(`Expires=${new Date(0).toUTCString()}`);
		parts.push('HttpOnly');
		if (IS_PRODUCTION) parts.push('Secure');
		parts.push(`SameSite=${COOKIE_SAMESITE.charAt(0).toUpperCase()}${COOKIE_SAMESITE.slice(1)}`);
		headers.append('Set-Cookie', parts.join('; '));
	}
	return headers;
}
