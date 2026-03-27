export const DATABASE_URL = process.env.DATABASE_URL as string;

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_WINDOWS = process.env.OS === 'WINDOWS';

export const PORT = process.env.PORT || 8000;

export const JWT_SECRET = process.env.JWT_SECRET ?? 'jwt-secret';
export const JWT_EXPIRE = process.env.JWT_EXPIRE ?? '7d'; // 7 days
export const SESSION_EXPIRE_TIME = 28 * 24 * 60 * 60;

export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'RESEND_API_KEY';

export const RAZORPAY_API_KEY = process.env.RAZORPAY_API_KEY ?? 'RAZORPAY_API_KEY';
export const RAZORPAY_API_SECRET = process.env.RAZORPAY_API_SECRET ?? 'RAZORPAY_API_SECRET';

export const RAZORPAY_CURRENCY = 'INR';
export const RAZORPAY_GUIDE_ENROLLMENT_AMOUNT = 500;

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
