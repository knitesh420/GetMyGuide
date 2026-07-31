import BalancePaymentService from '@services/balancePayment';

import { validateId } from '@/server/http/id';
import { withIdempotency } from '@/server/http/idempotency';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tourguide/:id/create-final-order — collect the balance still owed on
 * a direct booking whose advance has been paid.
 *
 * Chain: VerifySession → IDValidator → idempotency. There is deliberately NO
 * role gate: `BalancePaymentService.createOrder` authorises by comparing the
 * booking's owner against the session (`assertOwner`), so ownership rather than
 * rank decides who may settle a balance. This is the same service and the same
 * chain as POST /booking/:id/balance/create-order — the two are one flow reached
 * by two paths.
 *
 * The id is validated BEFORE the key is demanded, so a malformed id reports
 * "Invalid ID" rather than the missing header.
 *
 * The body is read only to hash it, matching the Express middleware, which
 * hashed `req.body` whether or not the route used it.
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
