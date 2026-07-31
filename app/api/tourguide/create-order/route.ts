import TourGuideService from '@services/tourguide';

import { createOrderSchema } from '@/server/modules/tourguide/tourguide.schema';
import { withIdempotency } from '@/server/http/idempotency';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tourguide/create-order — open the advance-payment order for a
 * direct guide booking.
 *
 * Express chain, in order: VerifySession → VerifyRole('tourist','admin') →
 * TourGuideCreateOrderValidator → idempotency → controller. Each step's position
 * is contract, not style:
 *
 *  - the role gate is EXACT, not min-level, so a guide — who outranks a tourist
 *    in the hierarchy — cannot open bookings against other guides;
 *  - role before validation, so an unauthorised caller cannot use the
 *    validator's messages to probe the payload shape;
 *  - validation before idempotency, so the key is only reserved for a payload
 *    that was going to be processed — otherwise a client retrying after fixing a
 *    typo would be told its key was already used with a different body.
 *
 * The body is read once and handed to both the validator and the idempotency
 * hash, because a Request body can only be consumed once. The hash is taken over
 * the RAW body, matching Express hashing `req.body` before the validator's
 * coercions — a retry with different dates must still be rejected.
 *
 * Idempotent because this mints a Razorpay order: two clicks on "Book" must not
 * become two orders.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	const raw = await readJsonBody(request);
	const input = validateBody(raw, createOrderSchema);

	return withIdempotency(request, user.userId, raw, async () => {
		const order = await TourGuideService.createOrder(input, user);
		return respond({ status: 200, data: order });
	});
});
