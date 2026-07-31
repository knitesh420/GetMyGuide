import BookingService from '@services/booking';
import { Types } from 'mongoose';

import { allocateGuideSchema } from '@/server/modules/booking/booking.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking/:id/allocate-guide — admin assigns a guide to a booking.
 *
 * Chain: VerifySession → VerifyMinLevel('admin') → IDValidator →
 * AllocateGuideValidator. Both orderings matter — admin before the id check, and
 * the id checked before the body — so a non-admin sees 403 regardless of what
 * they send, and a bad id is reported before a bad payload.
 *
 * No idempotency here: allocation is a state change on an existing booking
 * rather than a charge, and re-running it is not a double-spend.
 */
export const POST = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const bookingId = validateId(params.id);
	const data = await parseBody(request, allocateGuideSchema);

	const booking = await BookingService.allocateGuide(
		bookingId,
		new Types.ObjectId(data.guide_id)
	);

	return respond({ status: 200, data: booking });
});
