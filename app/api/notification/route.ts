import NotificationService from '@services/notification';
import type { NotificationType } from '@mongo/types/notification';

import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';
import { notificationAdminListQuerySchema } from '@/server/modules/notification/notification.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/notification — the admin's view of everyone's notifications.
 *
 * Deliberately NOT the same route as `/notification/my`: this one reads other
 * people's notifications, so it carries the admin gate that `/my` must not.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, type, recipient } = parseQuery(request, notificationAdminListQuerySchema);
	const result = await NotificationService.getAllForAdmin(
		{ type: type as NotificationType | undefined, recipient },
		{ page, limit }
	);

	return respond({ status: 200, data: result });
});
