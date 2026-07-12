import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const EARNING_STATUS = ['pending', 'payable', 'paid', 'reversed'] as const;

export type EarningListQueryValidationResult = {
	page: number;
	limit: number;
	status?: (typeof EARNING_STATUS)[number];
	guideId?: string;
};

export async function EarningListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		status: z.enum(EARNING_STATUS).optional(),
		guideId: z.string().trim().optional(),
	});

	return handle(validator.safeParse(req.query), req, next);
}

export type PayoutCreateValidationResult = {
	guideId: string;
	earningIds: string[];
	method: 'bank_transfer' | 'upi' | 'cash' | 'other';
	reference: string;
	note?: string;
};

export async function PayoutCreateValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		guideId: z.string().trim().min(1, 'guideId is required'),
		earningIds: z.array(z.string().trim().min(1)).min(1, 'Select at least one earning'),
		method: z.enum(['bank_transfer', 'upi', 'cash', 'other']),
		// The proof the money actually moved — a UTR, UPI txn id, or cheque no.
		// Required precisely because this endpoint does not move money itself.
		reference: z.string().trim().min(3, 'Enter the transfer reference (UTR / UPI txn id)').max(200),
		note: z.string().trim().max(2000).optional(),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type PayoutListQueryValidationResult = {
	page: number;
	limit: number;
	guideId?: string;
};

export async function PayoutListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		guideId: z.string().trim().optional(),
	});

	return handle(validator.safeParse(req.query), req, next);
}
