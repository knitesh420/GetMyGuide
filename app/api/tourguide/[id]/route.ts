import TourGuideService from '@services/tourguide';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tourguide/:id — read one direct booking.
 *
 * Chain: VerifySession → IDValidator. NO role gate, deliberately: the tourist
 * who booked, the guide allocated to it and an admin all read through here, and
 * `TourGuideService.assertVisible` is what distinguishes them. Adding a gate
 * would lock out either the guide or the tourist view.
 *
 * That absence is why the same malformed id a non-admin sends to PATCH
 * /:id/status is a 403 but is a 400 here. The difference is contract.
 *
 * Note this answers 403 for a booking that exists but is not yours, where the
 * `/booking/:id` read answers 404 — that route scopes its lookup by owner, this
 * one looks the booking up first and then authorises.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	const bookingId = validateId(params.id);

	const booking = await TourGuideService.getById(bookingId, user);

	return respond({ status: 200, data: booking });
});
