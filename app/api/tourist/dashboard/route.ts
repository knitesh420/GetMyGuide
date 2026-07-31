import TouristDashboardService from '@services/touristDashboard';
import { BadRequestError } from 'node-be-utilities';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/dashboard
 *
 * Single-request payload for the tourist Dashboard Home. Read-only aggregate of
 * data the detail pages already expose — it adds no new capability, so it is
 * gated exactly like /profile.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const overview = await TouristDashboardService.getOverview(user.userId);

	return respond({ status: 200, data: overview });
});
