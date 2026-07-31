import EarningService from '@services/earning';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/earning/payout-queue — earnings that have matured to 'payable'.
 *
 * Maturation is time-based and driven by the cron tick (promoteMaturedEarnings),
 * not by this read — so if this queue is unexpectedly empty on the deployed
 * app, the scheduler is the first thing to check.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const queue = await EarningService.getPayoutQueue();

	return respond({ status: 200, data: queue });
});
