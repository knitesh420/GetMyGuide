import ReviewService from '@services/review';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/review/:id — admin removes a review outright.
 *
 * Chain: VerifySession → VerifyMinLevel('admin') → IDValidator, so a non-admin
 * with a malformed id gets 403 rather than 400.
 *
 * The admin's id is passed to the service for the audit trail — deletion is
 * recorded against whoever performed it.
 */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const reviewId = validateId(params.id);
	const result = await ReviewService.deleteReview(reviewId, user.userId);

	return respond({ status: 200, data: result });
});
