import GuideService from '@services/guide';
import { BadRequestError } from 'node-be-utilities';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/guide/subscription-history — the caller's own membership history. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const history = await GuideService.getSubscriptionHistory(user.userId);

	return respond({ status: 200, data: history });
});
