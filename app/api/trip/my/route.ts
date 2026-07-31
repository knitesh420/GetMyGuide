import TripService from '@services/trip';

import { tripMyQuerySchema } from '@/server/modules/trip/trip.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/trip/my — the calling GUIDE's trips.
 *
 * Note the pair: `/trip/my` is the guide's view and `/trip/mine` the tourist's.
 * The names are nearly identical and the gates are not, so they are easy to
 * transpose — the guide id here comes from the session and is never a query
 * parameter.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const { page, limit, status } = parseQuery(request, tripMyQuerySchema);
	const result = await TripService.getMy(user.userId, { status }, { page, limit });

	return respond({ status: 200, data: result });
});
