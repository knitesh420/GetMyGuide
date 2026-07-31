import GuideService from '@services/guide';
import { BadRequestError } from 'node-be-utilities';

import { membershipConfirmPaymentSchema } from '@/server/modules/guide/guide.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/guide/membership/confirm-payment
 *
 * Verifies the Razorpay signature and activates the membership. No idempotency
 * wrapper here, matching the Express route: the service verifies the signature
 * against the order and is itself safe to re-run.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const data = await parseBody(request, membershipConfirmPaymentSchema);
	const result = await GuideService.confirmMembershipPayment(user.userId, data);

	return respond({ status: 200, data: result });
});
