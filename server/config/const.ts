export const DATABASE_URL = process.env.DATABASE_URL as string;

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Windows reports OS=Windows_NT, so the old `=== 'WINDOWS'` check was never true.
// Ask Node directly rather than trusting an environment variable.
export const IS_WINDOWS = process.platform === 'win32';

/**
 * SameSite policy for the auth cookies.
 *
 * 'lax' is correct whenever the frontend and the API share a registrable domain
 * (getmyguide.in and api.getmyguide.in do), and it is what stops a cross-site
 * form POST from carrying the session — the other half of the CSRF fix, along
 * with not parsing urlencoded bodies at all. Override with COOKIE_SAMESITE=none
 * only if the frontend is genuinely moved to an unrelated domain, and understand
 * that doing so re-opens that surface.
 */
export const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none';
// Lets one cookie serve both getmyguide.in and api.getmyguide.in. Unset in dev.
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

export const PORT = process.env.PORT || 8000;

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me';
export const JWT_ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE ?? '1d';
export const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE ?? '3d';

// Back-compat aliases (some older code may still import these)
export const JWT_SECRET = JWT_ACCESS_SECRET;
export const JWT_EXPIRE = JWT_ACCESS_EXPIRE;

export const SESSION_EXPIRE_TIME = 28 * 24 * 60 * 60;

export const OTP_TTL_SECONDS = 5 * 60; // 5 minutes
export const OTP_RATE_LIMIT_WINDOW_SECONDS = 10 * 60; // 10 minutes
export const OTP_RATE_LIMIT_MAX = 5;
export const OTP_MAX_VERIFY_ATTEMPTS = 5;

// Registration / password-reset OTP (distinct TTL from the admin-login OTP above)
export const REGISTRATION_OTP_TTL_SECONDS = 10 * 60; // 10 minutes
export const REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_OTP_TTL_SECONDS = 10 * 60; // 10 minutes
export const PENDING_REGISTRATION_TTL_SECONDS = 30 * 60; // 30 minutes

export const ACCESS_COOKIE_MAX_AGE_MS = 1 * 24 * 60 * 60 * 1000; // 1 day
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'RESEND_API_KEY';

export const RAZORPAY_API_KEY = process.env.RAZORPAY_API_KEY ?? 'RAZORPAY_API_KEY';
export const RAZORPAY_API_SECRET = process.env.RAZORPAY_API_SECRET ?? 'RAZORPAY_API_SECRET';
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'RAZORPAY_WEBHOOK_SECRET';

export const RAZORPAY_CURRENCY = 'INR';
export const RAZORPAY_GUIDE_ENROLLMENT_AMOUNT = 500;

// Recurring guide membership (post-account, post-profile). Reuses the
// existing one-time enrollment fee as a starting price point — change freely.
export const GUIDE_MEMBERSHIP_FEE = 500;
export const GUIDE_MEMBERSHIP_DURATION_DAYS = 30;

export const GUIDE_PAYMENT_LINK_BASE_URL =
	process.env.GUIDE_PAYMENT_LINK_BASE_URL ?? 'localhost/system/guide-verification-payment';

// ---- Bookings that split payment into an advance + a balance ---------------
// Package tours and direct guide bookings both take this fraction up front; the
// remainder is collected from the tourist before the trip starts.
export const BOOKING_ADVANCE_RATE = 0.2;

// ---- Guide earnings & payouts ---------------------------------------------
// Platform commission on a completed trip, as a percentage of the booking price.
// Snapshotted onto each Earning, so changing this never rewrites past ledger rows.
export const PLATFORM_COMMISSION_RATE = Number(process.env.PLATFORM_COMMISSION_RATE ?? 20);

// An earning stays 'pending' for this long after trip completion before it turns
// 'payable' and shows up in the admin payout queue. The window exists so a
// dispute or refund can reverse the earning before any money leaves.
export const EARNING_HOLD_DAYS = Number(process.env.EARNING_HOLD_DAYS ?? 3);

export enum Cookie {
	Auth = 'auth-cookie',
	Refresh = 'refresh-cookie',
}
export enum UserLevel {
	Tourist = 1,
	Guide = 5,
	Admin = 10,
}

export enum Path {
	Misc = '/static/misc/',
	Blogs = '/static/blogs/',
	Packages = '/static/packages/',
}

export const CACHE_TIMEOUT = 60 * 60; //seconds
export const REFRESH_CACHE_TIMEOUT = 30 * 24 * 60 * 60; //seconds

/**
 * Fail fast in production if any critical secret is missing or still using its
 * insecure development fallback. No-op outside production, so local dev keeps
 * working with the defaults above.
 */
export function assertProductionEnv(): void {
	if (!IS_PRODUCTION) return;

	const problems: string[] = [];
	const warnings: string[] = [];

	if (!process.env.DATABASE_URL) problems.push('DATABASE_URL is not set');
	if (JWT_ACCESS_SECRET === 'dev-access-secret-change-me')
		problems.push('JWT_ACCESS_SECRET is using the insecure development default');
	if (JWT_REFRESH_SECRET === 'dev-refresh-secret-change-me')
		problems.push('JWT_REFRESH_SECRET is using the insecure development default');
	// A secret that isn't the dev default can still be too short to be worth
	// anything. 24 chars is the hard floor — below that it is brute-forceable and
	// the process must not start. Between 24 and 32 it is warned about rather
	// than rejected, because raising the bar mid-life would invalidate every
	// issued token and force a fleet-wide re-login on deploy.
	for (const [name, secret] of [
		['JWT_ACCESS_SECRET', JWT_ACCESS_SECRET],
		['JWT_REFRESH_SECRET', JWT_REFRESH_SECRET],
	] as const) {
		if (secret.length < 24) {
			problems.push(`${name} is too short (${secret.length} chars); use at least 32`);
		} else if (secret.length < 32) {
			warnings.push(
				`${name} is ${secret.length} chars; 32+ is recommended. Rotating it will log every user out once.`
			);
		}
	}
	if (RESEND_API_KEY === 'RESEND_API_KEY') problems.push('RESEND_API_KEY is not set');
	if (RAZORPAY_API_KEY === 'RAZORPAY_API_KEY') problems.push('RAZORPAY_API_KEY is not set');
	if (RAZORPAY_API_SECRET === 'RAZORPAY_API_SECRET')
		problems.push('RAZORPAY_API_SECRET is not set');
	if (RAZORPAY_WEBHOOK_SECRET === 'RAZORPAY_WEBHOOK_SECRET')
		problems.push('RAZORPAY_WEBHOOK_SECRET is not set');

	if (warnings.length > 0) {
		// eslint-disable-next-line no-console
		console.warn(
			'Configuration warnings:\n' + warnings.map((w) => `  - ${w}`).join('\n')
		);
	}

	if (problems.length > 0) {
		throw new Error(
			'Refusing to start in production with insecure/missing configuration:\n' +
				problems.map((p) => `  - ${p}`).join('\n')
		);
	}
}
