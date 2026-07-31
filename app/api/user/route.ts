import UserService from '@/server/modules/user/user.service';

import { intOr, searchParam } from '@/server/modules/user/user.query';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/user — every account, optionally narrowed by ?role= and
 * ?search= (or its alias ?query=). Admin only.
 *
 * `role` is passed through unvalidated, exactly as the controller does — an
 * unrecognised value simply matches nothing rather than 400ing. Pagination uses
 * the module's `parseInt(...) || default` idiom; see user.query.ts for the three
 * behaviours a zod schema would silently change.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const params = new URL(request.url).searchParams;
	const role = (params.get('role') as 'tourist' | 'guide' | 'admin' | null) ?? undefined;
	const search = searchParam(params);

	const result = await UserService.getAllAccounts(
		{ role, search },
		intOr(params.get('limit'), 20),
		intOr(params.get('page'), 1)
	);

	return respond({ status: 200, data: result });
});
