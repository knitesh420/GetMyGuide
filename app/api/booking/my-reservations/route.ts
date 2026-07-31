import BookingService from '@services/booking';
import { Types } from 'mongoose';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/my-reservations — the bookings allocated to the calling guide.
 *
 * `requireMinLevel('guide')`, not `requireRole` — this one is hierarchical in
 * Express, so an admin passes too. It is the mirror of /my-bookings, and like it
 * the guide is taken from the session rather than the request.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const bookings = await BookingService.getMyReservations(new Types.ObjectId(user.userId));

	return respond({ status: 200, data: { bookings } });
});
