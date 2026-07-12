import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export type RefundRequestValidationResult = {
	bookingId: string;
	reason: string;
};

export async function RefundRequestValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		bookingId: z.string().trim().min(1, 'bookingId is required'),
		reason: z.string().trim().min(5, 'Please give a reason of at least 5 characters').max(2000),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type RefundApproveValidationResult = {
	approvedAmount: number;
	adminNote?: string;
};

export async function RefundApproveValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		// 0 is legitimate: cancel the booking, refund nothing.
		approvedAmount: z.coerce.number().min(0, 'Refund amount cannot be negative'),
		adminNote: z.string().trim().max(2000).optional(),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type RefundRejectValidationResult = {
	adminNote: string;
};

export async function RefundRejectValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		adminNote: z.string().trim().min(5, 'Tell the tourist why the request was declined').max(2000),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type RefundListQueryValidationResult = {
	page: number;
	limit: number;
	status?: 'pending' | 'processed' | 'rejected' | 'failed';
};

export async function RefundListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		status: z.enum(['pending', 'processed', 'rejected', 'failed']).optional(),
	});

	return handle(validator.safeParse(req.query), req, next);
}
