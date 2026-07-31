import TourGuideService from '@services/tourguide';

import { reassignSchema } from '@/server/modules/tourguide/tourguide.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/tourguide/:id/reassign-guide — an admin swaps the guide on a direct
 * booking, e.g. after the guide the tourist chose fell through.
 *
 * Chain: VerifySession → VerifyMinLevel('admin') → IDValidator →
 * TourGuideReassignValidator — admin before the id, as on /:id/status.
 *
 * The service delegates to the ordinary reassignment path, so the availability
 * check, the decline of the old assignment and the notifications behave exactly
 * as they do for admin-allocated bookings.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const bookingId = validateId(params.id);
	const { newGuideId } = await parseBody(request, reassignSchema);

	const booking = await TourGuideService.reassignGuide({
		bookingId,
		newGuideId,
		adminUserId: user.userId,
	});

	return respond({ status: 200, data: booking });
});
