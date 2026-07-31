import UserService from '@/server/modules/user/user.service';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/me — the calling account. The "who am I" endpoint.
 *
 * VerifySession only, no role floor: every signed-in role needs this, and it is
 * what the frontend calls on boot to decide which dashboard to render.
 *
 * Registered as a literal `me` segment so it is never parsed as an :id.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	const account = await UserService.getMe(user.userId);

	return respond({ status: 200, data: account });
});
