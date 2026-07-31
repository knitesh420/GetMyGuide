import GuideService from '@services/guide';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/guide/:id/reactivate — reverse a suspension.
 *
 * DELETE /api/guide/:id is a soft delete that only clears `isActive`; this flips
 * it back, so a mistakenly-suspended guide can be restored without touching the
 * database directly.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	// ObjectId, not string: the Express controller passed req.locals.id here,
	// and the service signature follows it.
	const id = validateId(params.id);
	const result = await GuideService.reactivateGuide(id);

	return respond({ status: 200, data: result });
});
