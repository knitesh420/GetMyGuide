import GuideService from '@services/guide';

import { guidePricingSchema } from '@/server/modules/guide/guide.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/guide/pricing — the guide's own rates.
 *
 * Direct bookings (/tourguide) are priced off these server-side, so they are
 * the guide's to set and nobody else's.
 */
export const PUT = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const { halfDay, fullDay } = await parseBody(request, guidePricingSchema);
	const pricing = await GuideService.updatePricing(user!.userId, { halfDay, fullDay });

	return respond({ status: 200, data: pricing });
});
