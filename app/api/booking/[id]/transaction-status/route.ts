import BookingService from '@services/booking';
import { Types } from 'mongoose';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/:id/transaction-status — payment state for one booking.
 *
 * Chain: VerifySession → IDValidator, with no role gate, matching GET /:id — the
 * service authorises against the booking using the caller's id and role.
 *
 * This is what the payment-status overlay polls after checkout, so its shape is
 * load-bearing on the frontend.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	const bookingId = validateId(params.id);

	const transactionStatus = await BookingService.getTransactionStatus(
		bookingId,
		new Types.ObjectId(user.userId),
		user.role
	);

	return respond({ status: 200, data: transactionStatus });
});
