import NotificationService from '@services/notification';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/notification/my/unread-count — drives the header bell badge. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	const result = await NotificationService.getUnreadCount(user.userId);

	return respond({ status: 200, data: result });
});
