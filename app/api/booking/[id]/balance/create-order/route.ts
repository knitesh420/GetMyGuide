import BalancePaymentService from '@services/balancePayment';

import { validateId } from '@/server/http/id';
import { withIdempotency } from '@/server/http/idempotency';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking/:id/balance/create-order — collect what is still owed on a
 * booking that was confirmed with an advance. Package tours and direct guide
 * bookings both settle through here.
 *
 * Chain: VerifySession → IDValidator → idempotency. There is deliberately NO
 * role gate: the payer may be a tourist, and `BalancePaymentService.createOrder`
 * authorises by comparing the booking's owner against the session
 * (`assertOwner`). A role check would be both redundant and wrong — it is
 * ownership, not rank, that decides who may pay a given balance.
 *
 * Idempotent because this mints a Razorpay order: two clicks on "Pay balance"
 * must not become two orders. The body is read only to hash it, matching the
 * Express middleware, which hashed `req.body` whether or not the route used it.
 */
export const POST = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	const bookingId = validateId(params.id);
	const raw = await readJsonBody(request);

	return withIdempotency(request, user.userId, raw, async () => {
		const order = await BalancePaymentService.createOrder(bookingId, user);
		return respond({ status: 200, data: order });
	});
});
