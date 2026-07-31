import BookingService from '@services/booking';
import { Types } from 'mongoose';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/my-bookings — the caller's own bookings.
 *
 * The owner is the session's userId and is never a request parameter, so there
 * is nothing here for a caller to point at someone else's account.
 *
 * `requireRole('tourist', 'admin')` is exact-membership: a guide is refused even
 * though it outranks a tourist. Guides read their side through /my-reservations.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	const bookings = await BookingService.getMyBookings(new Types.ObjectId(user.userId));

	return respond({ status: 200, data: { bookings } });
});
