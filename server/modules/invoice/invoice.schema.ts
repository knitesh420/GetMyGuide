import { z } from 'zod';

/**
 * Zod schemas for the invoice module.
 *
 * Extracted from invoice.validator.ts so the Express middleware and the native
 * Route Handlers share one definition.
 */

const baseInvoiceQuery = {
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	invoiceType: z.enum(['booking', 'guide_membership', 'trip_completion']).optional(),
	status: z.enum(['paid', 'refunded', 'cancelled']).optional(),
	search: z.string().trim().optional(),
	from: z.string().trim().optional(),
	to: z.string().trim().optional(),
};

export const invoiceListQuerySchema = z.object(baseInvoiceQuery);

export const invoiceExportQuerySchema = z.object({
	...baseInvoiceQuery,
	format: z.enum(['csv', 'excel']).default('csv'),
});
