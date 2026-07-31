import TripService from '@services/trip';

import { tripCompleteSchema } from '@/server/modules/trip/trip.schema';
import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/trip/:id/complete — the guide marks a trip finished.
 *
 * Same chain and same reasoning as /start: role before id, and the acting guide
 * comes from the session. Completion is what releases the guide's earnings, so
 * "which guide is calling" is not a detail the client gets to assert.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const tripId = validateId(params.id);
	const { completionNotes } = await parseBody(request, tripCompleteSchema);

	const trip = await TripService.complete(tripId, user.userId, completionNotes);

	return respond({ status: 200, data: trip });
});
