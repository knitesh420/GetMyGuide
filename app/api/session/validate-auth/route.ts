import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/session/validate-auth
 *
 * The identity comes from requireSession per request and is never read from
 * shared or module-level state — that is what keeps concurrent sessions safe on
 * a warm container serving many users.
 *
 * Cache-Control: no-store is carried over from the Express controller; a cached
 * identity response is a cross-user data leak.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);

	const headers = new Headers();
	headers.set('Cache-Control', 'no-store');

	return respond({ status: 200, data: { user }, headers });
});
