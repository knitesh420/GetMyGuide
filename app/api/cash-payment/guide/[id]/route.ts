import CashPaymentService from '@services/cashPayment';

import { cashPaymentListQuerySchema } from '@/server/modules/cashPayment/cashPayment.schema';
import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/cash-payment/guide/:id — one guide's records, admin only. */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const { page, limit } = parseQuery(request, cashPaymentListQuerySchema);

	const result = await CashPaymentService.getForGuide(id, { page, limit });

	return respond({ status: 200, data: result });
});
