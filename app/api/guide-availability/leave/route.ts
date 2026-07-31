import GuideAvailabilityService from '@services/guideAvailability';
import { BadRequestError } from 'node-be-utilities';

import { createLeaveSchema } from '@/server/modules/guideAvailability/guideAvailability.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/guide-availability/leave — a guide books their own vacation or
 * emergency leave.
 *
 * The guide is the session, never a body field: leave makes an account
 * unbookable for a date range, so an accepted guide id here would let one guide
 * take another off the market.
 *
 * The explicit userId check reproduces the controller's `BadRequestError`
 * rather than letting an empty id reach the service.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const data = await parseBody(request, createLeaveSchema);
	const leave = await GuideAvailabilityService.createLeave(user.userId, data);

	return respond({ status: 201, data: leave });
});
