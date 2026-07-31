import LocationService from '@services/location';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/locations/admin/all
 *
 * Every location including the inactive ones the public listing filters out.
 * Without this the admin panel could not undo a deactivation: switching a
 * location off would drop it from the admin's own table too.
 *
 * Next resolves this static path ahead of the sibling `[id]` segment, which is
 * the same precedence Express got from declaring `/admin/all` before `/:id`.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const locations = await LocationService.getAllForAdmin();

	return respond({ status: 200, data: locations });
});
