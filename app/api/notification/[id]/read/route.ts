import NotificationService from '@services/notification';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notification/:id/read
 *
 * The caller's userId is passed alongside the notification id, not just the id:
 * the service scopes the update to notifications that belong to this account, so
 * one user cannot mark another's as read.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);

	const id = validateId(params.id);
	const notification = await NotificationService.markRead(user.userId, id);

	return respond({ status: 200, data: notification });
});
