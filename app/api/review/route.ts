import ReviewService from '@services/review';

import { reviewCreateSchema, reviewListQuerySchema } from '@/server/modules/review/review.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/review — a tourist reviews a completed booking.
 *
 * `touristUserId` comes from the session, never the body. The service checks
 * that this account actually owns the booking being reviewed, which is what
 * stops anyone posting a rating against a stranger's trip.
 *
 * 201, not 200 — the Express controller's status, and the frontend keys off it.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'tourist');

	const { bookingId, rating, comment } = await parseBody(request, reviewCreateSchema);

	const review = await ReviewService.createReview({
		bookingId,
		touristUserId: user.userId,
		rating,
		comment,
	});

	return respond({ status: 201, data: review });
});

/**
 * GET /api/review — the admin moderation list, including hidden reviews.
 *
 * Same path, a different gate from POST above: anyone signed in as a tourist may
 * write one, but only an admin may read them all. Express registered both on
 * `router.route('/')`, and the two must not be collapsed into one shared check.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, guideId, minRating, isHidden } = parseQuery(request, reviewListQuerySchema);
	const result = await ReviewService.getAllForAdmin({ guideId, minRating, isHidden }, { page, limit });

	return respond({ status: 200, data: result });
});
