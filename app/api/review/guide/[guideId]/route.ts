import ReviewService from '@services/review';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/review/guide/:guideId — the public review list on a guide's profile.
 *
 * No session and no id validation, matching Express: the controller passes
 * `req.params.guideId` straight to the service. Adding `validateId` here would
 * be a tightening, not a fix — it would turn a malformed id from whatever the
 * service returns today into a 400, and this route is linked from public pages.
 *
 * The service is what filters hidden reviews out of this view.
 */
export const GET = createHandler(async (request, { params }) => {
	const result = await ReviewService.getPublicGuideReviews(params.guideId);

	return respond({ status: 200, data: result });
});
