import TripService from '@services/trip';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/trip/:id — one trip.
 *
 * Chain: VerifySession → VerifyMinLevel('tourist') → IDValidator. The 'tourist'
 * floor is the lowest rung of the hierarchy, so in practice it admits any
 * signed-in account; the real authorisation is inside `TripService.getById`,
 * which is handed the whole session payload and decides what this caller may
 * see.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'tourist');

	const tripId = validateId(params.id);
	const trip = await TripService.getById(tripId, user);

	return respond({ status: 200, data: trip });
});
