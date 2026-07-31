import UserService from '@/server/modules/user/user.service';

import { intOr } from '@/server/modules/user/user.query';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/role/:role — accounts of a single role, e.g. /user/role/guide.
 * Admin only.
 *
 * The role is taken from the path and passed through without validation,
 * matching the controller: an unknown role matches nothing rather than 400ing.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const search = new URL(request.url).searchParams;

	const result = await UserService.getAccountsByRole(
		params.role as 'tourist' | 'guide' | 'admin',
		intOr(search.get('limit'), 20),
		intOr(search.get('page'), 1)
	);

	return respond({ status: 200, data: result });
});
