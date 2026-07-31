import CashPaymentService from '@services/cashPayment';

import {
	cashPaymentUpdateSchema,
	cashPaymentVoidSchema,
} from '@/server/modules/cashPayment/cashPayment.schema';
import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody, readJsonBody, validateBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/cash-payment/:id — amend a record.
 *
 * The schema is .strict(), so smuggling in `status` or an audit field is a 400
 * rather than a silent no-op. A cash record can never be moved to a different
 * guide: that is a void plus a fresh record, so the audit trail shows it as such.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const paymentId = validateIdString(params.id);
	const data = await parseBody(request, cashPaymentUpdateSchema);

	const payment = await CashPaymentService.update({
		paymentId,
		data,
		adminUserId: user!.userId,
	});

	return respond({ status: 200, data: payment });
});

/**
 * DELETE /api/cash-payment/:id — SOFT delete.
 *
 * The row is voided, never removed: the audit trail has to survive. A reason is
 * optional, and a DELETE commonly carries no body at all, which is why the body
 * is read leniently rather than required.
 */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const paymentId = validateIdString(params.id);

	const raw = (await readJsonBody(request)) ?? {};
	const { reason } = validateBody(raw, cashPaymentVoidSchema);

	const payment = await CashPaymentService.void({
		paymentId,
		reason,
		adminUserId: user!.userId,
	});

	return respond({ status: 200, data: payment });
});
