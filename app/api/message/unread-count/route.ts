import MessageService from '@services/message';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/message/unread-count — the chat badge.
 *
 * A literal path, so it must not be swallowed by `/message/booking/:id`; Next
 * resolves static segments ahead of dynamic ones, which is what Express got from
 * declaring this route first.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	const result = await MessageService.getUnreadCount(user);

	return respond({ status: 200, data: result });
});
