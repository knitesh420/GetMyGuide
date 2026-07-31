import GuideService from '@services/guide';

import { validateId, validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/:id — public guide profile.
 *
 * Deliberately a different handler from GET /api/guide/admin/:id: this one must
 * never return bank details, payment identifiers or internal notes.
 */
export const GET = createHandler(async (_request, { params }) => {
	const id = validateIdString(params.id);
	const guide = await GuideService.getGuideById(id);

	return respond({ status: 200, data: guide });
});

/**
 * DELETE /api/guide/:id — admin soft delete.
 *
 * Only clears `isActive`; PATCH /api/guide/:id/reactivate reverses it.
 */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	// ObjectId, not string: the Express controller passed req.locals.id here,
	// and the service signature follows it.
	const id = validateId(params.id);
	const result = await GuideService.deactivateGuide(id);

	return respond({ status: 200, data: result });
});
