import ContactInquiryDB from '@mongo/repo/ContactInquiry';

import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/lead/contact/:id — one inquiry.
 *
 * Note the 404 goes through respond(), not an error throw: the controller
 * returned `Respond({ status: 404, data: { message } })`, which produces
 * `{ message, success: true }` rather than the error envelope. That is
 * inconsistent with the rest of the app but it is what the frontend receives,
 * so it is preserved rather than "fixed" here.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const inquiry = await ContactInquiryDB.findById(id).lean();

	if (!inquiry) {
		return respond({ status: 404, data: { message: 'Contact inquiry not found' } });
	}

	return respond({ status: 200, data: { inquiry } });
});

/** DELETE /api/lead/contact/:id */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const inquiry = await ContactInquiryDB.findByIdAndDelete(id);

	if (!inquiry) {
		return respond({ status: 404, data: { message: 'Contact inquiry not found' } });
	}

	return respond({ status: 200, data: { message: 'Contact inquiry deleted successfully' } });
});
