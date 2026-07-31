import AssignmentService from '@services/assignment';

import { assignmentMyQuerySchema } from '@/server/modules/assignment/assignment.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/assignment/my — the calling guide's own assignments.
 *
 * Scoped to the session's userId inside the service, never to a client-supplied
 * guide id — that is what stops one guide reading another's queue.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const { page, limit, status } = parseQuery(request, assignmentMyQuerySchema);
	const result = await AssignmentService.getMy(user!.userId, { status }, { page, limit });

	return respond({ status: 200, data: result });
});
