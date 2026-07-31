import BookingService from '@services/booking';

import {
	MISSING_PAYMENT_DETAILS,
	readVerifyPayload,
} from '@/server/modules/booking/booking.payload';
import { respond, respondJson } from '@/server/http/respond';
import { createHandler, readJsonBody } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking/verify-booking — settle a customised booking's payment.
 *
 * Order is contract: session, then role, then the body check. A guide posting a
 * malformed payload must see 403, not 400.
 *
 * `requireRole` rather than `requireMinLevel`: guides outrank tourists in the
 * hierarchy but must not reach tourist booking endpoints.
 *
 * Unlike the guest route, `user_id` comes from the session, which is what links
 * the resulting booking to the tourist's account.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	const payload = readVerifyPayload(await readJsonBody(request));

	if (!payload) {
		return respondJson({
			status: 400,
			body: { success: false, message: MISSING_PAYMENT_DETAILS },
		});
	}

	const booking = await BookingService.verifyAndCreateBooking({
		...payload,
		user_id: user.userId,
	});

	return respond({ status: 201, data: booking });
});
