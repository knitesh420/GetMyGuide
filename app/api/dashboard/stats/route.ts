import DashboardService from '@services/dashboard';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/stats — role-aware summary tiles.
 *
 * The frontend calls this from a shared hook without knowing the caller's role;
 * the shape is chosen server-side from the session. That is why the whole
 * session payload is passed to the service rather than just the user id.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	const stats = await DashboardService.getStats(user);

	return respond({ status: 200, data: stats });
});
