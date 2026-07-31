import GuideService from '@services/guide';
import { BadRequestError } from 'node-be-utilities';

import { withIdempotency } from '@/server/http/idempotency';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/guide/membership/create-order
 *
 * Creates a Razorpay order for the 30-day guide membership. Wrapped in
 * idempotency because a duplicate call here is a duplicate charge: the key is
 * reserved before the handler runs, so of two concurrent requests exactly one
 * creates an order and the other replays its response.
 *
 * The body is read before withIdempotency so the request hash is taken over the
 * same bytes Express hashed — a retry with a different payload must still be
 * rejected. This endpoint takes no body, so that is `{}`.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	return withIdempotency(request, user.userId, {}, async () => {
		const result = await GuideService.createMembershipOrder(user.userId);
		return respond({ status: 201, data: result });
	});
});
