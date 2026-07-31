import EarningService from '@services/earning';

import { payoutListQuerySchema } from '@/server/modules/earning/earning.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/earning/my/payouts — payouts the calling guide has received. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const { page, limit } = parseQuery(request, payoutListQuerySchema);
	const result = await EarningService.getMyPayouts(user!.userId, { page, limit });

	return respond({ status: 200, data: result });
});
