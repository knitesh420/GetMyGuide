import UserService from '@/server/modules/user/user.service';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/user/:id — DEACTIVATES a tourist; it does not delete the row.
 *
 * The verb and the service call disagree on purpose: bookings, payments and
 * invoices all reference the account, so it is flipped inactive and can be
 * restored through /user/:id/activate. Preserved as-is — making DELETE actually
 * delete would orphan financial records.
 */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const touristId = validateId(params.id);
	const result = await UserService.deactivateTourist(touristId);

	return respond({ status: 200, data: result });
});
