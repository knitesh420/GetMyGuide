import TourGuideService from '@services/tourguide';

import { quoteSchema } from '@/server/modules/tourguide/tourguide.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tourguide/quote — what would this guide cost for these dates?
 *
 * Chain: TourGuideQuoteValidator only. Deliberately PUBLIC, with no session
 * check: the booking page shows a price before the tourist signs in, and the
 * reply exposes nothing beyond the guide's already-public published day rate.
 *
 * The price the tourist is eventually charged is re-derived server-side at
 * order and at verify time, so this endpoint is a display value, never an input.
 */
export const GET = createHandler(async (request) => {
	const { guideId, startDate, endDate } = parseQuery(request, quoteSchema);
	const quote = await TourGuideService.quote({ guideId, startDate, endDate });

	return respond({ status: 200, data: quote });
});
