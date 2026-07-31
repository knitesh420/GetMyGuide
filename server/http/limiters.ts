import { OTP_RATE_LIMIT_MAX, OTP_RATE_LIMIT_WINDOW_SECONDS } from '@config/const';

import { clientIp, enforceRateLimit } from './rate-limit';

/**
 * The session module's rate limiters, transcribed from session.route.ts.
 *
 * Windows, maxima and key strategies are copied exactly. The email-keyed ones
 * matter: keying on `${ip}:${email}` rather than the IP alone stops an attacker
 * exhausting a specific victim's OTP quota by rotating IPs, and equally stops
 * one IP burning through many accounts.
 */

export const LOGIN_LIMIT = { prefix: 'login', windowSeconds: 10 * 60, max: 10 };

export const OTP_SEND_LIMIT = {
	prefix: 'otp-send',
	windowSeconds: OTP_RATE_LIMIT_WINDOW_SECONDS,
	max: OTP_RATE_LIMIT_MAX,
};

export const OTP_VERIFY_LIMIT = {
	prefix: 'otp-verify',
	windowSeconds: OTP_RATE_LIMIT_WINDOW_SECONDS,
	max: OTP_RATE_LIMIT_MAX * 2,
};

export const FORGOT_PASSWORD_LIMIT = {
	prefix: 'forgot-password',
	windowSeconds: 60 * 60,
	max: 5,
};

export const RESET_PASSWORD_VERIFY_LIMIT = {
	prefix: 'reset-password-verify',
	windowSeconds: OTP_RATE_LIMIT_WINDOW_SECONDS,
	max: OTP_RATE_LIMIT_MAX * 2,
};

export const REGISTER_OTP_SEND_LIMIT = {
	prefix: 'register-otp-send',
	windowSeconds: OTP_RATE_LIMIT_WINDOW_SECONDS,
	max: OTP_RATE_LIMIT_MAX,
};

export const REGISTER_OTP_VERIFY_LIMIT = {
	prefix: 'register-otp-verify',
	windowSeconds: OTP_RATE_LIMIT_WINDOW_SECONDS,
	max: OTP_RATE_LIMIT_MAX * 2,
};

/** `${ip}:${email}` — matches the Express keyFn, including the lowercasing. */
export function ipEmailKey(request: Request, body: unknown): string {
	const email =
		typeof body === 'object' && body !== null
			? String((body as { email?: unknown }).email ?? '')
			: '';
	return `${clientIp(request)}:${email.toLowerCase()}`;
}

export { clientIp, enforceRateLimit };
