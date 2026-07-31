import EarningService from '@services/earning';

import { earningListQuerySchema } from '@/server/modules/earning/earning.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/earning — the full ledger, admin only. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, status, guideId } = parseQuery(request, earningListQuerySchema);
	const result = await EarningService.getAll({ status, guideId }, { page, limit });

	return respond({ status: 200, data: result });
});
