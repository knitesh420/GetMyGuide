import Package from '@modules/package/package.schema';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/package/admin/all
 *
 * Every package, including the inactive ones the public listing filters out.
 * The admin panel needs those: without them, switching a service to `inactive`
 * would drop it from the admin's own table and leave no way to switch it back.
 *
 * Next resolves this static path ahead of the sibling `[id]` segment, matching
 * the precedence Express got from declaring `/admin/all` before `/:id`.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const packages = await Package.find({}).sort({ createdAt: -1 });

	return respond({
		status: 200,
		data: { success: true, count: packages.length, data: packages },
	});
});
