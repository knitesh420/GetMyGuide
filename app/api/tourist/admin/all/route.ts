import TouristService from '@services/tourist';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/admin/all — admin-only tourist management table.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const tourists = await TouristService.getAllTouristsForAdmin();

	// Wrapped under `data`: respond() spreads its payload onto the top level of
	// the body, so a bare array must not be passed straight to it — it would
	// arrive as {0:…,1:…} with the array-ness lost.
	return respond({ status: 200, data: { data: tourists } });
});
