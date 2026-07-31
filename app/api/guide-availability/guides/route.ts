import GuideAvailabilityService from '@services/guideAvailability';
import { endOfDay, startOfDay } from '@utils/bookingOccupiedRange';

import { guidesAvailabilityQuerySchema } from '@/server/modules/guideAvailability/guideAvailability.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide-availability/guides — guides annotated with availability over
 * a date range. Admin only; this is what the allocation screen reads.
 *
 * `endDate` falls back to `startDate`, so omitting it means "just that one
 * day". The range is widened to whole days with startOfDay/endOfDay, which is
 * why a guide booked at any point on the end date still reads as unavailable.
 *
 * The array is wrapped as `{ data: guides }` — `respond()` spreads its payload,
 * so a bare array would arrive index-keyed. See /leave/my for the same note.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { startDate, endDate } = parseQuery(request, guidesAvailabilityQuerySchema);

	const range = {
		start: startOfDay(new Date(startDate)),
		end: endOfDay(new Date(endDate || startDate)),
	};

	const guides = await GuideAvailabilityService.getGuidesAvailability(range);

	return respond({ status: 200, data: { data: guides } });
});
