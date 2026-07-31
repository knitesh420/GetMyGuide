import EarningService from '@services/earning';

import { earningListQuerySchema } from '@/server/modules/earning/earning.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/earning/my — the calling guide's own ledger.
 *
 * Note the query schema also accepts `guideId`, but it is deliberately NOT
 * forwarded here: the guide id comes from the session. Passing the client's
 * value through would let one guide read another's earnings.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const { page, limit, status } = parseQuery(request, earningListQuerySchema);
	const result = await EarningService.getMyEarnings(user!.userId, { status }, { page, limit });

	return respond({ status: 200, data: result });
});
