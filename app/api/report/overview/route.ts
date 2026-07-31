import ReportService from '@services/report';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/report/overview — admin-only headline figures. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const overview = await ReportService.getOverview();

	return respond({ status: 200, data: overview });
});
