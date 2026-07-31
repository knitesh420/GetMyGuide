import GuideAvailabilityService from '@services/guideAvailability';
import { BadRequestError } from 'node-be-utilities';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/guide-availability/leave/:id — a guide cancels their own leave.
 *
 * The guide id is passed to the service alongside the leave id, which is what
 * scopes the cancellation to the caller's own records: this is not an admin
 * route, so a leave belonging to someone else must not be cancellable here.
 */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const leaveId = validateId(params.id);
	const leave = await GuideAvailabilityService.cancelLeave(user.userId, leaveId);

	return respond({ status: 200, data: leave });
});
