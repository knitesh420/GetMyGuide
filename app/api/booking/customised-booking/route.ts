import BookingService from '@services/booking';
import { Types } from 'mongoose';

import { createBookingSchema } from '@/server/modules/booking/booking.schema';
import type { CreateBookingValidationResult } from '@/server/modules/booking/booking.validator';
import { withIdempotency } from '@/server/http/idempotency';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking/customised-booking — mint a Razorpay order for a bespoke tour.
 *
 * Express chain, in order: VerifySession → VerifyRole → CreateBookingValidator →
 * idempotency → controller. The order is contract, not style:
 *
 *  - role before validation, so an unauthorised caller cannot use the validator's
 *    error messages to probe the payload shape;
 *  - validation before idempotency, so the key is only reserved for a payload
 *    that was going to be processed — otherwise a client that retried after
 *    fixing a typo would be told its key was already used with a different body.
 *
 * The body is read once and handed to both the validator and the idempotency
 * hash, because a Request body can only be consumed once. The hash is taken over
 * the RAW body, matching Express hashing `req.body` before the validator's
 * transforms — a retry with a different payload must still be rejected.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	const raw = await readJsonBody(request);
	// Cast as the Express controller did: the schema makes `special_excursion`
	// optional while the service's type declares it required. Preserving the cast
	// keeps the accepted payloads identical rather than tightening them here.
	const data = validateBody(raw, createBookingSchema) as CreateBookingValidationResult;

	return withIdempotency(request, user.userId, raw, async () => {
		const result = await BookingService.createBooking(data, new Types.ObjectId(user.userId));
		return respond({ status: 200, data: result.data });
	});
});
