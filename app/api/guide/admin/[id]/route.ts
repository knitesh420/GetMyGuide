import GuideService from '@services/guide';

import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/admin/:id — one guide in full.
 *
 * Payment identifiers, bank details and internal notes are returned ONLY here,
 * which is why this is behind an admin check and the public /guide/:id is not
 * the same handler.
 *
 * In Express this had to be registered after the literal '/admin/all' and
 * '/admin/pending-approvals' routes so they were not swallowed by the ':id'
 * matcher. Next resolves static segments first, so that is now structural.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const detail = await GuideService.getGuideDetailForAdmin(id);

	return respond({ status: 200, data: detail });
});
