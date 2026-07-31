import EarningService from '@services/earning';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/earning/my/summary — totals for the calling guide's dashboard. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const summary = await EarningService.summaryFor(user!.userId);

	return respond({ status: 200, data: summary });
});
