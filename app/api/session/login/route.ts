import AuthService from '@services/auth';
import { loginSchema } from '@/server/modules/session/session.schema';
import { setAuthCookies } from '@/server/http/cookies';
import { clientIp, enforceRateLimit, LOGIN_LIMIT } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/session/login
 *
 * Native port of the Express route. The order below is the Express middleware
 * chain, and it is load-bearing: the rate limiter ran BEFORE the validator, so
 * a malformed body still consumes quota and cannot be looped to bypass the
 * limit.
 */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	await enforceRateLimit(LOGIN_LIMIT, clientIp(request));

	const data = validateBody(body, loginSchema);
	const result = await AuthService.login(data);

	const headers = new Headers();
	setAuthCookies(headers, result.accessToken, result.refreshToken);

	return respond({ status: 200, data: { user: result.user }, headers });
});
