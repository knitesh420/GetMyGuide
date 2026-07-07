import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type InvoiceListQueryValidationResult = {
	page: number;
	limit: number;
	invoiceType?: 'booking' | 'guide_membership' | 'trip_completion';
	status?: 'paid' | 'refunded' | 'cancelled';
	search?: string;
	from?: string;
	to?: string;
};

export async function InvoiceListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		invoiceType: z.enum(['booking', 'guide_membership', 'trip_completion']).optional(),
		status: z.enum(['paid', 'refunded', 'cancelled']).optional(),
		search: z.string().trim().optional(),
		from: z.string().trim().optional(),
		to: z.string().trim().optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type InvoiceExportQueryValidationResult = InvoiceListQueryValidationResult & {
	format: 'csv' | 'excel';
};

export async function InvoiceExportQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		invoiceType: z.enum(['booking', 'guide_membership', 'trip_completion']).optional(),
		status: z.enum(['paid', 'refunded', 'cancelled']).optional(),
		search: z.string().trim().optional(),
		from: z.string().trim().optional(),
		to: z.string().trim().optional(),
		format: z.enum(['csv', 'excel']).default('csv'),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}
