import ReportService from '@services/report';

import { bookingsTrendSchema } from '@/server/modules/report/report.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/report/bookings-trend?range=7d|30d|90d — defaults to 30d. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { range } = parseQuery(request, bookingsTrendSchema);
	const trend = await ReportService.getBookingsTrend(range);

	return respond({ status: 200, data: trend });
});
