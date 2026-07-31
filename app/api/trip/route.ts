import TripService from '@services/trip';

import { tripListQuerySchema } from '@/server/modules/trip/trip.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/trip — every trip. Admin only, paginated, filterable by status and
 * guide.
 *
 * `guideId` is a filter here, not an identity claim: the caller has already
 * been proven an admin, so narrowing by guide is a view preference. Contrast
 * with /trip/my, where the guide comes from the session precisely because it
 * must not be selectable.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, status, guideId } = parseQuery(request, tripListQuerySchema);
	const result = await TripService.getAll({ status, guideId }, { page, limit });

	return respond({ status: 200, data: result });
});
