import NotificationService from '@services/notification';

import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireSession } from '@/server/http/session';
import { notificationListQuerySchema } from '@/server/modules/notification/notification.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/notification/my — the caller's own notifications.
 *
 * Any authenticated role, and scoped by the session's userId rather than by
 * anything the client sends: the recipient is never a parameter here, which is
 * what stops one account reading another's notifications.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);

	const { page, limit, unreadOnly } = parseQuery(request, notificationListQuerySchema);
	const result = await NotificationService.getMyNotifications(user.userId, {
		page,
		limit,
		unreadOnly,
	});

	return respond({ status: 200, data: result });
});
