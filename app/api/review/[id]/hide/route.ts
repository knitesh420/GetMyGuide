import ReviewService from '@services/review';

import { reviewHideSchema } from '@/server/modules/review/review.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/review/:id/hide — admin hides or un-hides a review.
 *
 * `isHidden` is required and takes both directions, so this is the un-hide
 * route too. It is preprocessed rather than coerced, because
 * `z.coerce.boolean()` reads the string "false" as `true` — which would make
 * "un-hide this review" hide it instead.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const reviewId = validateId(params.id);
	const { isHidden } = await parseBody(request, reviewHideSchema);

	const review = await ReviewService.setHidden(reviewId, isHidden, user.userId);

	return respond({ status: 200, data: review });
});
