import TourGuideService from '@services/tourguide';

import { statusSchema } from '@/server/modules/tourguide/tourguide.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/tourguide/:id/status — an admin moves a direct booking along its
 * lifecycle by hand.
 *
 * Chain: VerifySession → VerifyMinLevel('admin') → IDValidator →
 * TourGuideStatusValidator. Admin is checked BEFORE the id, which is what makes
 * a non-admin sending a malformed id a 403 and an admin sending the same id a
 * 400. Swapping the two would leak which ids are well-formed to callers with no
 * business asking — the same property `DELETE /booking/:id` has, and the
 * opposite of `GET /tourguide/:id`, which has no role gate at all.
 *
 * The body speaks the UI's vocabulary ('Upcoming' | 'Completed'); the service
 * maps it onto the Booking model's own enum.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const bookingId = validateId(params.id);
	const { status } = await parseBody(request, statusSchema);

	const booking = await TourGuideService.updateStatus(bookingId, status, user.userId);

	return respond({ status: 200, data: booking });
});
