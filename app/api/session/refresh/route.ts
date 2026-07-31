import { Cookie } from '@config/const';
import AuthService from '@services/auth';
import { UnauthorizedError } from 'node-be-utilities';

import { clearAuthCookies, setAuthCookies } from '@/server/http/cookies';
import { respond, respondError } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { readCookie } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/session/refresh
 *
 * Handles its own errors rather than letting createHandler catch them, because
 * the Express controller cleared the auth cookies on ANY refresh failure — that
 * is what stops a client with a dead refresh token retrying forever. The error
 * body is still produced by respondError, so the wire format is unchanged.
 */
export const POST = createHandler(async (request) => {
	try {
		const refreshToken = readCookie(request, Cookie.Refresh);
		if (!refreshToken) {
			throw new UnauthorizedError('Refresh token is required');
		}

		const result = await AuthService.refresh(refreshToken);

		const headers = new Headers();
		setAuthCookies(headers, result.accessToken, result.refreshToken);

		return respond({ status: 200, data: { user: result.user }, headers });
	} catch (err) {
		const headers = new Headers();
		clearAuthCookies(headers);
		return respondError(err, headers);
	}
});
