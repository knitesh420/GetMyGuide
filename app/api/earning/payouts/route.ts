import EarningService from '@services/earning';

import {
	payoutCreateSchema,
	payoutListQuerySchema,
} from '@/server/modules/earning/earning.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/earning/payouts — settlement history, admin only. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page, limit, guideId } = parseQuery(request, payoutListQuerySchema);
	const result = await EarningService.getPayouts({ guideId }, { page, limit });

	return respond({ status: 200, data: result });
});

/**
 * POST /api/earning/payouts — record a transfer the admin already made.
 *
 * This endpoint moves NO money. It closes the ledger against a transfer made
 * out-of-band, which is exactly why `reference` (UTR / UPI txn id / cheque no.)
 * is mandatory — without it there is nothing tying the ledger entry to the real
 * transfer, and the audit trail is worthless.
 *
 * 201: a Payout row is created.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { guideId, earningIds, method, reference, note } = await parseBody(
		request,
		payoutCreateSchema
	);

	const payout = await EarningService.createPayout({
		guideId,
		earningIds,
		method,
		reference,
		note,
		adminUserId: user!.userId,
	});

	return respond({ status: 201, data: payout });
});
