import TourGuideService from '@services/tourguide';

import { listQuerySchema } from '@/server/modules/tourguide/tourguide.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tourguide/user-bookings — the calling tourist's own direct bookings.
 *
 * Chain: VerifySession → VerifyRole('tourist','admin') → TourGuideListQueryValidator.
 * The gate is exact, so a guide reading their side of these bookings goes
 * through /guide/my-bookings instead, not here.
 *
 * The owner is never a request parameter: the service scopes the query by
 * `user.userId`. A port that accepted an id from the client would pass every
 * status assertion and quietly expose one tourist's bookings to another.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	const { page, limit } = parseQuery(request, listQuerySchema);
	const result = await TourGuideService.getUserBookings(user, { page, limit });

	return respond({ status: 200, data: result });
});
