import AssignmentService from '@services/assignment';

import { assignmentReassignSchema } from '@/server/modules/assignment/assignment.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/assignment/:id/reassign — admin moves a booking to another guide.
 *
 * 201, not 200: reassignment creates a NEW assignment row rather than mutating
 * the old one, which is what preserves the audit trail of who was asked and
 * when. Overriding an availability conflict requires a written reason.
 */
export const POST = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const currentAssignmentId = validateId(params.id);
	const { newGuideId, adminNotes, override, overrideReason } = await parseBody(
		request,
		assignmentReassignSchema
	);

	const assignment = await AssignmentService.reassignGuide({
		currentAssignmentId,
		newGuideId,
		adminNotes,
		override,
		overrideReason,
		adminUserId: user!.userId,
	});

	return respond({ status: 201, data: assignment });
});
