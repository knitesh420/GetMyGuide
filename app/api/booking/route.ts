import BookingService from '@services/booking';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking — every booking in the system. Admin only.
 *
 * Unpaginated, as in Express. Left that way deliberately: the admin table reads
 * the whole list, and adding pagination here would change a response shape the
 * dashboard already consumes.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const bookings = await BookingService.getAllBookings();

	return respond({ status: 200, data: { bookings } });
});
