import CashPaymentService from '@services/cashPayment';

import {
	cashPaymentCreateSchema,
	cashPaymentListQuerySchema,
} from '@/server/modules/cashPayment/cashPayment.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manually recorded cash payments. These live alongside — never on top of — the
 * online Razorpay payments in `transactions`: a guide's full payment history is
 * the union of the two, and neither collection can overwrite the other.
 */

/** GET /api/cash-payment — admin collection. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, guideId, status } = parseQuery(request, cashPaymentListQuerySchema);
	const result = await CashPaymentService.getAll({ guideId, status }, { page, limit });

	return respond({ status: 200, data: result });
});

/**
 * POST /api/cash-payment — record a payment.
 *
 * adminUserId comes from the session, never the body. The schema deliberately
 * does not accept `recordedBy` / `createdBy` / `status`: a client that could
 * name the recorder could forge the audit trail.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { guideId, ...data } = await parseBody(request, cashPaymentCreateSchema);

	const payment = await CashPaymentService.create({
		// The service takes the guide's ACCOUNT id under its own name, with the
		// remaining fields nested under `data` — not spread alongside it.
		guideAccountId: guideId,
		data,
		// Recorded By, taken from the session — never from the request body.
		adminUserId: user!.userId,
	});

	return respond({ status: 201, data: payment });
});
