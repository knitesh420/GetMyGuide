import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/session/validate-auth/admin
 *
 * Same as validate-auth, gated to admin. Uses the hierarchical check to match
 * the Express route's VerifyMinLevel('admin') exactly.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const headers = new Headers();
	headers.set('Cache-Control', 'no-store');

	return respond({ status: 200, data: { user }, headers });
});
