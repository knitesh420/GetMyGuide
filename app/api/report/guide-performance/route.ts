import ReportService from '@services/report';

import { guidePerformanceSchema } from '@/server/modules/report/report.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/report/guide-performance?limit=N — capped at 100, defaults to 10. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { limit } = parseQuery(request, guidePerformanceSchema);
	const rows = await ReportService.getGuidePerformance(limit);

	return respond({ status: 200, data: rows });
});
