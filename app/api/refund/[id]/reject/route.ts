import RefundService from '@services/refund';

import { refundRejectSchema } from '@/server/modules/refund/refund.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/refund/:id/reject
 *
 * adminNote is required and shown to the tourist verbatim, which is why the
 * schema enforces a minimum length rather than allowing an empty string.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const refundId = validateId(params.id);
	const { adminNote } = await parseBody(request, refundRejectSchema);

	const result = await RefundService.reject({
		refundId,
		adminNote,
		adminUserId: user!.userId,
	});

	return respond({ status: 200, data: result });
});
