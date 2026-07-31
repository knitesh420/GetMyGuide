import NotificationService from '@services/notification';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notification/read-all — mark everything read for the caller.
 *
 * Two segments, so it can never collide with the three-segment `[id]/read`
 * route below it; Express relied on declaration order for the same thing.
 */
export const PATCH = createHandler(async (request) => {
	const user = await requireSession(request);
	const result = await NotificationService.markAllRead(user.userId);

	return respond({ status: 200, data: result });
});
