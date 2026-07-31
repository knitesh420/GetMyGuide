import TourGuideService from '@services/tourguide';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/my-bookings — the calling guide's own bookings.
 *
 * In Express this had to be registered before '/:id' so 'my-bookings' was not
 * read as a guide id. Next resolves static segments ahead of dynamic ones, so
 * that ordering constraint no longer exists.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const result = await TourGuideService.getMyGuideBookings(user!.userId);

	return respond({ status: 200, data: result });
});
