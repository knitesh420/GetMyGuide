import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import type { z } from 'zod';

import { invoiceExportQuerySchema, invoiceListQuerySchema } from './invoice.schema';

/**
 * Express validator middleware for the invoice module.
 *
 * The schemas now live in ./invoice.schema.ts so the native Route Handlers
 * validate against the same objects. Behaviour unchanged.
 */

export type InvoiceListQueryValidationResult = {
	page: number;
	limit: number;
	invoiceType?: 'booking' | 'guide_membership' | 'trip_completion';
	status?: 'paid' | 'refunded' | 'cancelled';
	search?: string;
	from?: string;
	to?: string;
};

export type InvoiceExportQueryValidationResult = InvoiceListQueryValidationResult & {
	format: 'csv' | 'excel';
};

function validateQuery<T>(schema: z.ZodType<T>) {
	return async function validator(req: Request, _res: Response, next: NextFunction) {
		const result = schema.safeParse(req.query);

		if (result.success) {
			req.locals.data = result.data as object;
			return next();
		}

		const message = result.error.issues
			.map((err) => `${err.path.join('.')}: ${err.message}`)
			.join(', ');

		return next(new BadRequestError(message));
	};
}

export const InvoiceListQueryValidator = validateQuery(invoiceListQuerySchema);
export const InvoiceExportQueryValidator = validateQuery(invoiceExportQuerySchema);
