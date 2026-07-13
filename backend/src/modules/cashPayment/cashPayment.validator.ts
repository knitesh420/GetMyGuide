import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const PAID_BY = ['tourist', 'admin'] as const;

export type CashPaymentCreateValidationResult = {
	guideId: string;
	amount: number;
	paymentDate: Date;
	paidBy: (typeof PAID_BY)[number];
	touristName?: string;
	bookingReference?: string;
	remarks?: string;
};

/**
 * Note what is NOT accepted here: `recordedBy`, `createdBy`, `status`. The
 * recording admin is taken from the session, never from the body — a client that
 * could name the recorder could forge the audit trail.
 */
export async function CashPaymentCreateValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		guideId: z.string().trim().min(1, 'Select a guide'),
		amount: z.coerce.number().positive('Enter the amount received'),
		// Cash is recorded after the fact, so the date is nearly always in the past.
		// A future date is a typo, not an intent.
		paymentDate: z.coerce
			.date({ message: 'Enter a valid payment date' })
			.refine((date) => date.getTime() <= Date.now(), {
				message: 'The payment date cannot be in the future',
			}),
		paidBy: z.enum(PAID_BY, { message: 'Say whether the tourist or the admin paid' }),
		touristName: z.string().trim().max(200).optional(),
		bookingReference: z.string().trim().max(200).optional(),
		remarks: z.string().trim().max(2000).optional(),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type CashPaymentUpdateValidationResult = {
	amount?: number;
	paymentDate?: Date;
	paidBy?: (typeof PAID_BY)[number];
	touristName?: string;
	bookingReference?: string;
	remarks?: string;
};

/**
 * `.strict()` so an attempt to smuggle in `status`, `guide` or an audit field is
 * a 400 rather than a silent no-op. A cash record can never be moved to a
 * different guide: that is a void plus a fresh record, and the audit trail should
 * show it as such.
 */
export async function CashPaymentUpdateValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z
		.object({
			amount: z.coerce.number().positive('Enter the amount received').optional(),
			paymentDate: z.coerce
				.date({ message: 'Enter a valid payment date' })
				.refine((date) => date.getTime() <= Date.now(), {
					message: 'The payment date cannot be in the future',
				})
				.optional(),
			paidBy: z.enum(PAID_BY).optional(),
			touristName: z.string().trim().max(200).optional(),
			bookingReference: z.string().trim().max(200).optional(),
			remarks: z.string().trim().max(2000).optional(),
		})
		.strict()
		.refine((data) => Object.keys(data).length > 0, {
			message: 'Provide at least one field to update',
		});

	return handle(validator.safeParse(req.body), req, next);
}

export type CashPaymentVoidValidationResult = {
	reason?: string;
};

export async function CashPaymentVoidValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		reason: z.string().trim().max(2000).optional(),
	});

	return handle(validator.safeParse(req.body ?? {}), req, next);
}

export type CashPaymentListQueryValidationResult = {
	page: number;
	limit: number;
	guideId?: string;
	status?: 'received' | 'voided';
};

export async function CashPaymentListQueryValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const validator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		guideId: z.string().trim().optional(),
		status: z.enum(['received', 'voided']).optional(),
	});

	return handle(validator.safeParse(req.query), req, next);
}
