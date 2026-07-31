import MessageService from '@services/message';

import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireSession } from '@/server/http/session';
import { messageThreadListQuerySchema } from '@/server/modules/message/message.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/message/threads — the caller's conversation list.
 *
 * The whole session payload goes to the service, not just the userId: which
 * threads exist for you depends on your role (a guide sees the bookings
 * allocated to them, a tourist sees their own).
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);

	const { page, limit } = parseQuery(request, messageThreadListQuerySchema);
	const result = await MessageService.getThreads(user, { page, limit });

	return respond({ status: 200, data: result });
});
