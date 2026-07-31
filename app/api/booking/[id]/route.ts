import BookingService from '@services/booking';
import { Types } from 'mongoose';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/:id — one booking.
 *
 * Chain: VerifySession → IDValidator. No role gate, deliberately: the service
 * scopes the lookup by userId and role, so a tourist sees their own, a guide
 * sees one allocated to them, and an admin sees any. Adding a role check here
 * would lock out one of those three.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	const bookingId = validateId(params.id);

	const booking = await BookingService.getBookingById(
		bookingId,
		new Types.ObjectId(user.userId),
		user.role
	);

	return respond({ status: 200, data: booking });
});

/**
 * DELETE /api/booking/:id — admin only.
 *
 * Chain: VerifySession → VerifyMinLevel('admin') → IDValidator. The order is
 * contract: the admin check runs BEFORE the id is validated, so a non-admin
 * passing a malformed id gets 403, not 400. Swapping them would leak which ids
 * are well-formed to callers who have no business asking.
 */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const bookingId = validateId(params.id);
	const result = await BookingService.deleteBooking(bookingId);

	return respond({ status: 200, data: result });
});
