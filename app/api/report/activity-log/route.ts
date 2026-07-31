import ReportService from '@services/report';

import { activityLogQuerySchema } from '@/server/modules/report/report.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/report/activity-log — paginated audit trail, admin only. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, action, actorType, from, to } = parseQuery(
		request,
		activityLogQuerySchema
	);

	const result = await ReportService.getActivityLog(
		{ action, actorType, from, to },
		{ page, limit }
	);

	return respond({ status: 200, data: result });
});
