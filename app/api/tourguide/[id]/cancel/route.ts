import RefundService from '@services/refund';

import { cancelSchema } from '@/server/modules/tourguide/tourguide.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tourguide/:id/cancel — OPEN a cancellation request. Answers 201.
 *
 * It does not cancel anything. Every cancellation, including one an admin asks
 * for, becomes a request an admin then decides on, so that the refund amount is
 * always set explicitly in one place. Do not "fix" this into a direct cancel.
 *
 * Chain: VerifySession → IDValidator → TourGuideCancelValidator. No role gate:
 * the tourist who owns the booking, the guide allocated to it and an admin may
 * all raise one, and `RefundService.assertCanRequest` is what decides that. A
 * role check at the door would lock out two of those three.
 *
 * The id is passed as a STRING here, unlike the other :id routes — the Express
 * controller called `req.locals.id!.toString()`, and RefundService compares it
 * against string ids.
 */
export const POST = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	const bookingId = validateId(params.id);
	const { reason } = await parseBody(request, cancelSchema);

	const cancellation = await RefundService.requestCancellation({
		bookingId: bookingId.toString(),
		user,
		reason,
	});

	return respond({ status: 201, data: cancellation });
});
