import TourGuideService from '@services/tourguide';

import { listQuerySchema } from '@/server/modules/tourguide/tourguide.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tourguide/all — every direct booking, for the admin console.
 *
 * Chain: VerifySession → VerifyMinLevel('admin') → TourGuideListQueryValidator.
 * Min-level here rather than the exact VerifyRole used on the tourist routes;
 * with 'admin' at the top of the hierarchy the two happen to admit the same set
 * today, but the Express route says min-level and that is what is reproduced.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit } = parseQuery(request, listQuerySchema);
	const result = await TourGuideService.getAll({ page, limit });

	return respond({ status: 200, data: result });
});
