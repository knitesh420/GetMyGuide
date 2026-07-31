import AuthService from '@services/auth';

import { registerVerifyOtpSchema } from '@/server/modules/session/session.schema';
import { setAuthCookies } from '@/server/http/cookies';
import { enforceRateLimit, ipEmailKey, REGISTER_OTP_VERIFY_LIMIT } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/session/register/verify-otp
 *
 * Promotes the PendingRegistration into a real Account and logs the user in.
 * Status is 201, not 200 — an account was created, and the frontend branches on
 * it, so this is part of the contract.
 */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	await enforceRateLimit(REGISTER_OTP_VERIFY_LIMIT, ipEmailKey(request, body));

	const data = validateBody(body, registerVerifyOtpSchema);
	const result = await AuthService.verifyRegistrationOtp(data.email, data.otp);

	const headers = new Headers();
	setAuthCookies(headers, result.accessToken, result.refreshToken);

	return respond({ status: 201, data: { user: result.user }, headers });
});
