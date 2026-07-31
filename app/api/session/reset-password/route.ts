import AuthService from '@services/auth';

import { resetPasswordSchema } from '@/server/modules/session/session.schema';
import { setAuthCookies } from '@/server/http/cookies';
import { enforceRateLimit, ipEmailKey, RESET_PASSWORD_VERIFY_LIMIT } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/session/reset-password
 *
 * A successful reset logs the user straight in, so it issues fresh cookies.
 * AuthService also bumps tokenVersion, invalidating any session an attacker
 * still held — which is the point of resetting.
 */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	await enforceRateLimit(RESET_PASSWORD_VERIFY_LIMIT, ipEmailKey(request, body));

	const data = validateBody(body, resetPasswordSchema);
	const result = await AuthService.resetPassword(data.email, data.otp, data.newPassword);

	const headers = new Headers();
	setAuthCookies(headers, result.accessToken, result.refreshToken);

	return respond({ status: 200, data: { user: result.user }, headers });
});
