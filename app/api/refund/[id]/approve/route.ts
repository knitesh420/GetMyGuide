import RefundService from '@services/refund';

import { refundApproveSchema } from '@/server/modules/refund/refund.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/refund/:id/approve — admin approves, and money actually moves.
 *
 * approvedAmount may be 0: that means "cancel the booking, refund nothing",
 * which is a real outcome. The schema uses .min(0), not .positive(), for that
 * reason.
 *
 * adminUserId comes from the session so the ledger records who approved it.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const refundId = validateId(params.id);
	const { approvedAmount, adminNote } = await parseBody(request, refundApproveSchema);

	const result = await RefundService.approve({
		refundId,
		approvedAmount,
		adminNote,
		adminUserId: user!.userId,
	});

	return respond({ status: 200, data: result });
});
