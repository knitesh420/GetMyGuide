import ContactInquiryDB from '@mongo/repo/ContactInquiry';

import { INQUIRY_STATUSES } from '@/server/modules/lead/lead.schema';
import { validateIdString } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/lead/contact/:id/status
 *
 * As with GET above, the invalid-status and not-found replies go through
 * respond() rather than an error throw — matching the controller, which used
 * Respond() with a 400/404 status. The body is therefore
 * `{ message, success: true }`, not the error envelope.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const body = (await readJsonBody(request)) as { status?: string } | undefined;
	const status = body?.status;

	if (!status || !(INQUIRY_STATUSES as readonly string[]).includes(status)) {
		return respond({
			status: 400,
			data: { message: 'Invalid status. Must be one of: pending, reviewed, resolved' },
		});
	}

	const inquiry = await ContactInquiryDB.findByIdAndUpdate(id, { status }, { new: true }).lean();

	if (!inquiry) {
		return respond({ status: 404, data: { message: 'Contact inquiry not found' } });
	}

	return respond({
		status: 200,
		data: { inquiry, message: 'Inquiry status updated successfully' },
	});
});
