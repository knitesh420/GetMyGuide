import MessageService from '@services/message';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PATCH /api/message/booking/:id/read — clear the caller's unread marks. */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);

	const id = validateId(params.id);
	const result = await MessageService.markThreadRead(id, user.userId);

	return respond({ status: 200, data: result });
});
