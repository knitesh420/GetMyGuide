import GuideAvailabilityService from '@services/guideAvailability';
import { BadRequestError } from 'node-be-utilities';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide-availability/leave/my — the calling guide's leave records.
 *
 * The array is wrapped as `{ data: leaves }` deliberately. `respond()` SPREADS
 * its payload onto the response root, so handing it a bare array would produce
 * an index-keyed object (`{"0":…,"1":…}`) rather than a JSON array, and the
 * client reads `response.data` as a real array. Same wrapping as the Express
 * controller — see also /guide-availability/guides.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const leaves = await GuideAvailabilityService.getMyLeaves(user.userId);

	return respond({ status: 200, data: { data: leaves } });
});
