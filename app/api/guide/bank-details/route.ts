import GuideService from '@services/guide';

import { guideBankDetailsSchema } from '@/server/modules/guide/guide.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PUT /api/guide/bank-details — where the admin sends this guide's payouts. */
export const PUT = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	const data = await parseBody(request, guideBankDetailsSchema);
	const bankDetails = await GuideService.updateBankDetails(user!.userId, data);

	return respond({ status: 200, data: bankDetails });
});
