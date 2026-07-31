import AuthService from '@services/auth';

import { clearAuthCookies } from '@/server/http/cookies';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/session/logout
 *
 * AuthService.logout bumps the account's tokenVersion, which invalidates every
 * previously issued access token rather than just this browser's — clearing the
 * cookies alone would leave a stolen token usable until it expired.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);

	if (user?.userId) {
		await AuthService.logout(user.userId);
	}

	const headers = new Headers();
	clearAuthCookies(headers);

	return respond({ status: 200, data: { message: 'Logged out successfully' }, headers });
});
