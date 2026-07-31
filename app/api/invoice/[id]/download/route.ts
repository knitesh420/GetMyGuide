import InvoiceService from '@services/invoice';

import { validateId } from '@/server/http/id';
import { SECURITY_HEADERS } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Invoice PDFs are rendered with pdfkit and can embed a QR code, so this is the
 * slowest handler in the app. It is the open R5 risk from the Phase 1 plan:
 * generation time has never been measured on Vercel, only locally.
 *
 * 60s is the Hobby ceiling. If real invoices approach it, the fix is to
 * pre-generate the PDF when the invoice is created (the service already uploads
 * one to Cloudinary) and have this route redirect to the stored copy rather than
 * rendering on demand.
 */
export const maxDuration = 60;

/**
 * GET /api/invoice/:id/download
 *
 * Returns the PDF bytes directly rather than a Cloudinary link: an invoice is
 * private, and a CDN URL would be readable by anyone who found it.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);

	const id = validateId(params.id);
	const { buffer, filename } = await InvoiceService.downloadPdf(id, user);

	const headers = new Headers(SECURITY_HEADERS);
	headers.set('Content-Type', 'application/pdf');
	headers.set('Content-Disposition', `attachment; filename="${filename}"`);
	// Financial documents must never sit in a shared cache.
	headers.set('Cache-Control', 'private, no-store');

	return new Response(new Uint8Array(buffer), { status: 200, headers });
});
