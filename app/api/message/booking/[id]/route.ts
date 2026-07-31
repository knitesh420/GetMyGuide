import MessageService from '@services/message';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody, parseQuery } from '@/server/http/route';
import { requireSession } from '@/server/http/session';
import {
	messageSendSchema,
	messageThreadQuerySchema,
} from '@/server/modules/message/message.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Every thread is scoped to a booking, and authorisation lives in the service:
 * it checks the caller against that booking — its tourist, its allocated guide,
 * or an admin. That is why the session payload is passed down rather than just
 * the userId, and why there is no role gate on the route itself. Adding one here
 * would be redundant at best and, if it disagreed with the service, would open
 * or close the wrong conversations.
 */

/** GET /api/message/booking/:id — poll a thread, optionally from a cursor. */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);

	const id = validateId(params.id);
	const { after, limit } = parseQuery(request, messageThreadQuerySchema);
	const messages = await MessageService.getThread(id, user, { after, limit });

	return respond({ status: 200, data: messages });
});

/** POST /api/message/booking/:id — send into the thread. */
export const POST = createHandler(async (request, { params }) => {
	const user = await requireSession(request);

	const id = validateId(params.id);
	const { body } = await parseBody(request, messageSendSchema);
	const message = await MessageService.send({ bookingId: id, user, body });

	return respond({ status: 201, data: message });
});
