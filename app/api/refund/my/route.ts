import RefundService from '@services/refund';

import { refundListQuerySchema } from '@/server/modules/refund/refund.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/refund/my — the caller's own refund history.
 *
 * Scoped by the session's userId, never a client-supplied one.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);

	const { page, limit } = parseQuery(request, refundListQuerySchema);
	const result = await RefundService.getMy(user.userId, { page, limit });

	return respond({ status: 200, data: result });
});
