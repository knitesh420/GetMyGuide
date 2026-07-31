import BookingService from '@services/booking';

import {
	MISSING_PAYMENT_DETAILS,
	readVerifyPayload,
} from '@/server/modules/booking/booking.payload';
import { respond, respondJson } from '@/server/http/respond';
import { createHandler, readJsonBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking/verify-guest-booking — unauthenticated, signature-gated.
 *
 * The companion order-creation endpoint was removed; this one is kept as a rare
 * safety net for a session that lapses in the seconds between paying and
 * verifying. It is safe unauthenticated because it settles an order that was
 * created authenticated: a caller must present a valid Razorpay signature for an
 * existing order, and the resulting booking links to the tourist through the
 * transaction's stored account.
 *
 * `user_id` is deliberately NOT forwarded from the body, exactly as in the
 * Express controller. On an unauthenticated route a caller-supplied account id
 * is an unverified identity claim — accepting it would let anyone attach a
 * booking to any account by supplying its ObjectId.
 */
export const POST = createHandler(async (request) => {
	const payload = readVerifyPayload(await readJsonBody(request));

	if (!payload) {
		return respondJson({
			status: 400,
			body: { success: false, message: MISSING_PAYMENT_DETAILS },
		});
	}

	const booking = await BookingService.verifyAndCreateBooking(payload);

	return respond({ status: 201, data: booking });
});
