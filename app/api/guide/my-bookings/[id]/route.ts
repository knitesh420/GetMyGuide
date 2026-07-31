import TourGuideService from '@services/tourguide';

import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/guide/my-bookings/:id — one of the caller's own bookings. */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const id = validateIdString(params.id);
	const booking = await TourGuideService.getMyGuideBookingById(user!.userId, id);

	return respond({ status: 200, data: booking });
});
