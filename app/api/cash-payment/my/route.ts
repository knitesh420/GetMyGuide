import CashPaymentService from '@services/cashPayment';

import { cashPaymentListQuerySchema } from '@/server/modules/cashPayment/cashPayment.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cash-payment/my — a guide reading their own cash records.
 *
 * Scoped by the session's userId. A guide may read these but never create,
 * edit or void one; those are admin-only.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const { page, limit } = parseQuery(request, cashPaymentListQuerySchema);
	const result = await CashPaymentService.getMy(user!.userId, { page, limit });

	return respond({ status: 200, data: result });
});
