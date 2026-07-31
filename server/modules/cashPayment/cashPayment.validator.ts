import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import {
	cashPaymentCreateSchema,
	cashPaymentListQuerySchema,
	cashPaymentUpdateSchema,
	cashPaymentVoidSchema,
	PAID_BY,
} from './cashPayment.schema';

/**
 * Express validator middleware for the cashPayment module.
 *
 * The schemas now live in ./cashPayment.schema.ts so the native Route Handlers
 * validate against the same objects. Behaviour unchanged.
 */

export type CashPaymentCreateValidationResult = {
	guideId: string;
	amount: number;
	paymentDate: Date;
	paidBy: (typeof PAID_BY)[number];
	touristName?: string;
	bookingReference?: string;
	remarks?: string;
};

export type CashPaymentUpdateValidationResult = {
	amount?: number;
	paymentDate?: Date;
	paidBy?: (typeof PAID_BY)[number];
	touristName?: string;
	bookingReference?: string;
	remarks?: string;
};

export type CashPaymentVoidValidationResult = {
	reason?: string;
};

export type CashPaymentListQueryValidationResult = {
	page: number;
	limit: number;
	guideId?: string;
	status?: 'received' | 'voided';
};

export async function CashPaymentCreateValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(cashPaymentCreateSchema.safeParse(req.body), req, next);
}

export async function CashPaymentUpdateValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(cashPaymentUpdateSchema.safeParse(req.body), req, next);
}

export async function CashPaymentVoidValidator(req: Request, _res: Response, next: NextFunction) {
	// `?? {}` — a DELETE commonly carries no body, and voiding without a reason
	// is allowed.
	return handle(cashPaymentVoidSchema.safeParse(req.body ?? {}), req, next);
}

export async function CashPaymentListQueryValidator(
	req: Request,
	_res: Response,
	next: NextFunction
) {
	return handle(cashPaymentListQuerySchema.safeParse(req.query), req, next);
}
