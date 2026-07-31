import AssignmentService from '@services/assignment';

import {
	assignmentCreateSchema,
	assignmentListQuerySchema,
} from '@/server/modules/assignment/assignment.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/assignment — admin allocates a guide to a booking.
 *
 * 201, not 200: a new assignment row is created and the frontend branches on it.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { bookingId, guideId, adminNotes, override, overrideReason } = await parseBody(
		request,
		assignmentCreateSchema
	);

	const assignment = await AssignmentService.createAssignment({
		bookingId,
		guideId,
		adminNotes,
		override,
		overrideReason,
		adminUserId: user!.userId,
	});

	return respond({ status: 201, data: assignment });
});

/** GET /api/assignment — admin list, paginated and filterable. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, status, guideId, bookingId } = parseQuery(
		request,
		assignmentListQuerySchema
	);

	const result = await AssignmentService.getAll({ status, guideId, bookingId }, { page, limit });

	return respond({ status: 200, data: result });
});
