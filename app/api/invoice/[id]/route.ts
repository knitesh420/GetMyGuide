import InvoiceService from '@services/invoice';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/invoice/:id
 *
 * The session is passed to the service, which decides whether this caller may
 * read this invoice. Invoices carry names, amounts and contact details, so
 * dropping that argument would expose one customer's invoice to another.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);

	const id = validateId(params.id);
	const invoice = await InvoiceService.getById(id, user);

	return respond({ status: 200, data: invoice });
});
