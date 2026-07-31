import TourGuideService from '@services/tourguide';

import { verifyAndCreateSchema } from '@/server/modules/tourguide/tourguide.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tourguide/verify-and-create — verify the advance payment and create
 * the booking. Answers 201, not 200.
 *
 * Chain: VerifySession → VerifyRole('tourist','admin') → TourGuideVerifyValidator.
 * The role gate runs before the body is inspected, and is exact rather than
 * hierarchical for the same reason as /create-order.
 *
 * NOT idempotent, matching Express, and safely so: `fulfillDirectBooking` keys
 * off the unique `transaction_id` on Booking, so one captured payment yields
 * exactly one booking even when the browser and the Razorpay webhook race — the
 * loser returns the winner's booking rather than creating a second one.
 *
 * Note this validator requires `booking_data` where the balance-payment one does
 * not; the two schemas are separate for that reason and must not be merged.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	const payload = await parseBody(request, verifyAndCreateSchema);

	const booking = await TourGuideService.verifyAndCreate({ ...payload, user });

	return respond({ status: 201, data: booking });
});
