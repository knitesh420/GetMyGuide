import BalancePaymentService from '@services/balancePayment';

import { paymentVerifySchema } from '@/server/modules/tourguide/tourguide.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tourguide/:id/verify-final-payment — settle the balance payment on a
 * direct booking.
 *
 * Chain: VerifySession → IDValidator → PaymentVerifyValidator. The id is checked
 * before the body, so a malformed id reports "Invalid ID" even when the payload
 * is also wrong. No role gate, for the same ownership reason as create-final-order.
 *
 * `paymentVerifySchema` is the schema POST /booking/:id/balance/verify also uses
 * — the same service call behind both — and the two must not drift apart into
 * different rejection messages.
 *
 * Not idempotent, matching Express, and safely so: the Razorpay signature binds
 * this call to one specific payment, and the service decides whether that
 * payment has already been applied.
 */
export const POST = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	const bookingId = validateId(params.id);
	const payload = await parseBody(request, paymentVerifySchema);

	const booking = await BalancePaymentService.verify(bookingId, payload, user);

	return respond({ status: 200, data: booking });
});
