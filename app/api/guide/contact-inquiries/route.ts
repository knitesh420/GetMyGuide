import GuideService from '@services/guide';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/guide/contact-inquiries — admin list, optionally filtered. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const params = new URL(request.url).searchParams;

	const filter: { category?: string; status?: string } = {};
	const category = params.get('category');
	const status = params.get('status');
	if (category) filter.category = category;
	if (status) filter.status = status;

	const inquiries = await GuideService.getAllContactInquiries(filter);

	return respond({ status: 200, data: { inquiries, total: inquiries.length } });
});
