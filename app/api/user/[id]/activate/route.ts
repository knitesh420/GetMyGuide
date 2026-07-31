import UserService from '@/server/modules/user/user.service';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/user/:id/activate — restore a previously deactivated tourist.
 *
 * The inverse of DELETE /api/user/:id, which only flips the flag. Note that
 * `isActive` is also what `requireSession` checks, so reactivating here is what
 * lets the account hold a session again.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const touristId = validateId(params.id);
	const result = await UserService.activateTourist(touristId);

	return respond({ status: 200, data: result });
});
