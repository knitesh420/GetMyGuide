import ReviewService from '@services/review';

import { reviewMyQuerySchema } from '@/server/modules/review/review.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/review/mine/guide — reviews the calling GUIDE has received.
 *
 * The counterpart of /review/my (reviews a tourist has written). Note this path
 * is `mine/guide` while the public listing is `guide/:guideId` — two different
 * routes that both mention "guide", and only this one is session-scoped.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const { page, limit } = parseQuery(request, reviewMyQuerySchema);
	const result = await ReviewService.getMineAsGuide(user.userId, { page, limit });

	return respond({ status: 200, data: result });
});
