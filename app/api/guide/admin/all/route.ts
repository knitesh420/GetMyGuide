import GuideService from '@services/guide';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/guide/admin/all — every guide, active or not, for the admin table. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const guides = await GuideService.getAllGuidesForAdmin();

	// Wrapped under `data`: respond() spreads its payload onto the top level, so
	// a bare array would arrive as {0:…,1:…} with the array-ness lost.
	return respond({ status: 200, data: { data: guides } });
});
