import GuideService from '@services/guide';

import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/guide/:id/approve — admin approves a guide's KYC.
 *
 * Approval is also what starts the membership clock, so the approving admin's
 * id is recorded with it.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const guide = await GuideService.approveGuide(id, user!.userId);

	return respond({ status: 200, data: guide });
});
