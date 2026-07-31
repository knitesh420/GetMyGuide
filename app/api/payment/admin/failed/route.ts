import PaymentService from '@services/payment';

import { failedPaymentQuerySchema } from '@/server/modules/payment/payment.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payment/admin/failed
 *
 * Payments that were declined, or that cleared but whose follow-up bookkeeping
 * was abandoned. Admin-only — these rows carry customer contact details.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, ...filters } = parseQuery(request, failedPaymentQuerySchema);
	const result = await PaymentService.listFailedPayments(filters, { page, limit });

	return respond({ status: 200, data: result });
});
