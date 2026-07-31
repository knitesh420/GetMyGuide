import ReviewService from '@services/review';

import { reviewMyQuerySchema } from '@/server/modules/review/review.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/review/my — reviews the calling TOURIST has written.
 *
 * Pairs with /review/mine/guide, which is what a guide has RECEIVED. Same
 * shape, different subject, so keep the two straight: the author here comes
 * from the session.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'tourist');

	const { page, limit } = parseQuery(request, reviewMyQuerySchema);
	const result = await ReviewService.getMyReviews(user.userId, { page, limit });

	return respond({ status: 200, data: result });
});
