import AssignmentService from '@services/assignment';

import { assignmentRespondSchema } from '@/server/modules/assignment/assignment.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/assignment/:id/respond — the guide accepts or declines.
 *
 * guideUserId comes from the session, never the body: otherwise one guide could
 * respond on another's behalf. A decline requires a reason (enforced by the
 * schema) because it is surfaced to the admin and recorded.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const assignmentId = validateId(params.id);
	const { action, declineReason } = await parseBody(request, assignmentRespondSchema);

	const result = await AssignmentService.respond({
		assignmentId,
		guideUserId: user!.userId,
		action,
		declineReason,
	});

	return respond({ status: 200, data: result });
});
