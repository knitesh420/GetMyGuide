import GuideService from '@services/guide';

import { guideRejectSchema } from '@/server/modules/guide/guide.schema';
import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/guide/:id/reject — admin rejects a guide's KYC.
 *
 * The reason is shown to the guide verbatim, which is why the schema enforces a
 * minimum length. Rejection also triggers the auto-refund of their membership
 * payment inside the service.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const { reason } = await parseBody(request, guideRejectSchema);

	const guide = await GuideService.rejectGuide(id, reason, user!.userId);

	return respond({ status: 200, data: guide });
});
