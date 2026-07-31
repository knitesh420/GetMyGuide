import TripService from '@services/trip';

import { tripStartSchema } from '@/server/modules/trip/trip.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/trip/:id/start — the guide marks a trip started.
 *
 * Chain: VerifySession → VerifyMinLevel('guide') → IDValidator → validator. The
 * role is checked before the id, so a tourist sending a malformed id sees 403
 * rather than 400.
 *
 * The acting guide is taken from the session and passed to the service, which
 * is what stops one guide starting another's trip.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const tripId = validateId(params.id);
	const { notes } = await parseBody(request, tripStartSchema);

	const trip = await TripService.start(tripId, user.userId, notes);

	return respond({ status: 200, data: trip });
});
