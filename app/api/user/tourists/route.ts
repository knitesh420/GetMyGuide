import UserService from '@/server/modules/user/user.service';

import { intOr } from '@/server/modules/user/user.query';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/tourists — the tourist directory. Admin only.
 *
 * Note the default limit is 10 here and 20 on `GET /api/user`. That is not a
 * transcription slip: the two endpoints have always differed, and the admin
 * tables page off those defaults.
 *
 * This one reads `?search=` only — the `?query=` alias is accepted by
 * /api/user, not by this route.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const params = new URL(request.url).searchParams;
	const search = params.get('search') ?? undefined;

	const result = await UserService.getAllTourists(
		search,
		intOr(params.get('limit'), 10),
		intOr(params.get('page'), 1)
	);

	return respond({ status: 200, data: result });
});
