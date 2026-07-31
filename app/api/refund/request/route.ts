import RefundService from '@services/refund';

import { refundRequestSchema } from '@/server/modules/refund/refund.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/refund/request — ask to cancel a booking.
 *
 * Deliberately no role gate: anyone attached to a booking (its tourist, its
 * guide) may ask. The service does the ownership check, which is why the whole
 * session payload is passed rather than just the id — narrowing it here would
 * move that check to the wrong layer or drop it.
 *
 * Nothing is cancelled and no money moves until an admin approves.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);

	const { bookingId, reason } = await parseBody(request, refundRequestSchema);

	const result = await RefundService.requestCancellation({
		bookingId,
		user,
		reason,
	});

	return respond({ status: 201, data: result });
});
