import AssignmentService from '@services/assignment';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/assignment/guides — guides an admin may allocate to a booking. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const guides = await AssignmentService.getAssignableGuides();

	// Wrapped under `data`: respond() spreads its payload onto the top level, so
	// a bare array would arrive as numeric-keyed props and `response.data` would
	// be undefined on the client.
	return respond({ status: 200, data: { data: guides } });
});
