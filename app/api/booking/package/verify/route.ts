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
 * POST /api/booking/package/verify — settle the 20% advance on a package tour.
 *
 * Same shape as /verify-booking, but a different service call: a package
 * booking is confirmed with an advance and leaves a balance, which is collected
 * later through /booking/:id/balance/*.
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

	const booking = await BookingService.verifyAndCreatePackageBooking({
		...payload,
		user_id: user.userId,
	});

	return respond({ status: 201, data: booking });
});
