import BookingService from '@services/booking';
import { Types } from 'mongoose';

import { packageBookingSchema } from '@/server/modules/booking/booking.schema';
import { withIdempotency } from '@/server/http/idempotency';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking/package/create-order — 20% advance on a package tour.
 *
 * Same chain and the same reasoning as /customised-booking: session → role →
 * validate → idempotency. The price is derived server-side from the tour, so
 * nothing about the amount is taken from this payload.
 *
 * The literal `package/` path segment wins over the `[id]` matcher in Next for
 * the same reason the Express route is registered above `/:id`.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	const raw = await readJsonBody(request);
	const data = validateBody(raw, packageBookingSchema);

	return withIdempotency(request, user.userId, raw, async () => {
		const result = await BookingService.createPackageOrder(data, new Types.ObjectId(user.userId));
		return respond({ status: 200, data: result.data });
	});
});
