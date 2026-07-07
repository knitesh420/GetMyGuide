export const DATABASE_URL = process.env.DATABASE_URL as string;

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_WINDOWS = process.env.OS === 'WINDOWS';

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

export const ACCESS_COOKIE_MAX_AGE_MS = 1 * 24 * 60 * 60 * 1000; // 15 minutes
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
