import GuideAvailabilityService from '@services/guideAvailability';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide-availability/calendar/:id — any guide's merged calendar.
 *
 * Admin only, which is the difference from /calendar/me: here the guide is
 * chosen by the caller, so the gate has to be the thing that makes it safe.
 *
 * The id is stringified before the service call, matching the controller.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const guideId = validateId(params.id);
	const calendar = await GuideAvailabilityService.getGuideCalendar(guideId.toString());

	return respond({ status: 200, data: calendar });
});
