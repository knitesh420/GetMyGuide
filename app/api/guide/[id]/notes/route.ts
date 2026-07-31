import GuideService from '@services/guide';

import { guideAdminNotesSchema } from '@/server/modules/guide/guide.schema';
import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/guide/:id/notes — internal admin notes on a guide.
 *
 * Never readable by the guide themselves: they are returned only by the
 * admin-gated GET /api/guide/admin/:id.
 */
export const PUT = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const { notes } = await parseBody(request, guideAdminNotesSchema);

	const result = await GuideService.updateAdminNotes(id, notes, user!.userId);

	return respond({ status: 200, data: result });
});
