import RefundService from '@services/refund';

import { refundListQuerySchema } from '@/server/modules/refund/refund.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/refund — the admin refund queue. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, status } = parseQuery(request, refundListQuerySchema);
	const result = await RefundService.getAll({ status }, { page, limit });

	return respond({ status: 200, data: result });
});
