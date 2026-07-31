import GuideService from '@services/guide';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/guide/admin/pending-approvals — the KYC review inbox. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const guides = await GuideService.getPendingApprovals();

	return respond({ status: 200, data: guides });
});
