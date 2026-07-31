import GuideService from '@services/guide';

import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/:id/pricing-details — public.
 *
 * What this guide charges and whether they can be booked directly. No session:
 * the Express route ran IDValidator only. Booking prices are still derived
 * server-side at checkout, so exposing the rates here is not a pricing surface.
 */
export const GET = createHandler(async (_request, { params }) => {
	const id = validateIdString(params.id);
	const pricing = await GuideService.getPricingDetails(id);

	return respond({ status: 200, data: pricing });
});
