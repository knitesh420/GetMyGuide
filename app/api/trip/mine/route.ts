import TripService from '@services/trip';

import { tripMyQuerySchema } from '@/server/modules/trip/trip.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/trip/mine — the calling TOURIST's trips. The counterpart of
 * /trip/my, which is the guide's view.
 *
 * It shares tripMyQuerySchema, so `status` is accepted and validated, but the
 * controller drops it before calling the service — `getMyAsTourist` takes only
 * pagination. Transcribed as-is: passing status through would be a behaviour
 * change, not a bug fix, since the tourist list has never been filterable.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'tourist');

	const { page, limit } = parseQuery(request, tripMyQuerySchema);
	const result = await TripService.getMyAsTourist(user.userId, { page, limit });

	return respond({ status: 200, data: result });
});
