import TripService from '@services/trip';

import { tripCancelSchema } from '@/server/modules/trip/trip.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/trip/:id/cancel — ADMIN only, unlike /start and /complete.
 *
 * A guide can begin and finish a trip but cannot cancel one, because a
 * cancellation is what triggers the refund path. That asymmetry is the whole
 * point of this route being separate; do not "harmonise" the three gates.
 *
 * `reason` is optional in the schema, matching Express.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const tripId = validateId(params.id);
	const { reason } = await parseBody(request, tripCancelSchema);

	const trip = await TripService.cancel(tripId, user.userId, reason);

	return respond({ status: 200, data: trip });
});
