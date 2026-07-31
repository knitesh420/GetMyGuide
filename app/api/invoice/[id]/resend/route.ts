import InvoiceService from '@services/invoice';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/invoice/:id/resend — re-email an invoice. Admin only.
 *
 * Unlike the read routes, this takes no session argument: the service resends
 * to the invoice's own recipient, not to the caller. Admin-gated because it
 * sends mail on the customer's behalf.
 */
export const POST = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateId(params.id);
	const invoice = await InvoiceService.resend(id);

	return respond({ status: 200, data: invoice });
});
