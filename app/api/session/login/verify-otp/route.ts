import AuthService from '@services/auth';

import { otpLoginSchema } from '@/server/modules/session/session.schema';
import { setAuthCookies } from '@/server/http/cookies';
import { enforceRateLimit, ipEmailKey, OTP_VERIFY_LIMIT } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/session/login/verify-otp — completes the admin OTP login. */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	await enforceRateLimit(OTP_VERIFY_LIMIT, ipEmailKey(request, body));

	const data = validateBody(body, otpLoginSchema);
	const result = await AuthService.loginWithOtp(data.email, data.otp);

	const headers = new Headers();
	setAuthCookies(headers, result.accessToken, result.refreshToken);

	return respond({ status: 200, data: { user: result.user }, headers });
});
