import AssignmentService from '@services/assignment';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/assignment/:id
 *
 * The session payload is passed to the service, not just the id: getById uses it
 * to decide whether this caller may see this assignment. Passing only the id
 * would drop that check.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const id = validateId(params.id);
	const assignment = await AssignmentService.getById(id, user!);

	return respond({ status: 200, data: assignment });
});
