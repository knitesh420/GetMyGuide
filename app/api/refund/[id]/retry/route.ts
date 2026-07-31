import RefundService from '@services/refund';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/refund/:id/retry
 *
 * Re-attempts only the Razorpay legs that FAILED on an already-approved refund.
 * It is not a second approval and must not become one — the service decides
 * which legs are outstanding, so a retry on a fully-settled refund is a no-op
 * rather than a double payout.
 */
export const POST = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const refundId = validateId(params.id);

	const result = await RefundService.retry({
		refundId,
		adminUserId: user!.userId,
	});

	return respond({ status: 200, data: result });
});
