import InvoiceService from '@services/invoice';

import { invoiceExportQuerySchema } from '@/server/modules/invoice/invoice.schema';
import { SECURITY_HEADERS } from '@/server/http/respond';
import { createHandler, parseQuery } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Excel export builds a workbook in memory with exceljs. Like the PDF download,
 * this is part of the unmeasured R5 risk — a large export is the most likely
 * handler in the app to approach the function timeout.
 */
export const maxDuration = 60;

/**
 * GET /api/invoice/admin/export?format=csv|excel
 *
 * `page` and `limit` are parsed and deliberately DISCARDED — an export covers
 * the whole filtered set, not one page. The Express controller destructured
 * them away for the same reason; forwarding them would silently truncate the
 * export to 20 rows.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { page: _page, limit: _limit, format, ...filters } = parseQuery(
		request,
		invoiceExportQuerySchema
	);

	const { buffer, filename, contentType } = await InvoiceService.exportList(
		user,
		filters,
		format
	);

	const headers = new Headers(SECURITY_HEADERS);
	headers.set('Content-Type', contentType);
	headers.set('Content-Disposition', `attachment; filename="${filename}"`);
	headers.set('Cache-Control', 'private, no-store');

	return new Response(new Uint8Array(buffer), { status: 200, headers });
});
