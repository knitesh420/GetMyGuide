import InvoiceService from '@services/invoice';

import { invoiceListQuerySchema } from '@/server/modules/invoice/invoice.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/invoice
 *
 * No role gate: the service scopes the list from the session payload — an admin
 * sees everything, a tourist or guide only their own. That is why the whole
 * session is passed rather than just a userId.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);

	const { page, limit, invoiceType, status, search, from, to } = parseQuery(
		request,
		invoiceListQuerySchema
	);

	const result = await InvoiceService.list(
		user,
		{ invoiceType, status, search, from, to },
		{ page, limit }
	);

	return respond({ status: 200, data: result });
});
