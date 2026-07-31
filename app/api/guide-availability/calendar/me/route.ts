import GuideAvailabilityService from '@services/guideAvailability';
import { BadRequestError } from 'node-be-utilities';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide-availability/calendar/me — the calling guide's merged calendar
 * (unavailable dates + leaves + booked ranges).
 *
 * Registered as a literal `me` segment so it can never be read as an :id — the
 * Express router relies on registration order for that, Next on static segments
 * outranking dynamic ones. Same service as /calendar/:id, but scoped to the
 * session instead of admin-selectable.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const calendar = await GuideAvailabilityService.getGuideCalendar(user.userId);

	return respond({ status: 200, data: calendar });
});
