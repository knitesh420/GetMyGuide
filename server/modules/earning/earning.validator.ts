import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import {
	EARNING_STATUS,
	earningListQuerySchema,
	payoutCreateSchema,
	payoutListQuerySchema,
} from './earning.schema';

/**
 * Express validator middleware for the earning / payout module.
 *
 * The schemas now live in ./earning.schema.ts so the native Route Handlers
 * validate against the same objects. Behaviour unchanged.
 */

export type EarningListQueryValidationResult = {
	page: number;
	limit: number;
	status?: (typeof EARNING_STATUS)[number];
	guideId?: string;
};

export type PayoutCreateValidationResult = {
	guideId: string;
	earningIds: string[];
	method: 'bank_transfer' | 'upi' | 'cash' | 'other';
	reference: string;
	note?: string;
};

export type PayoutListQueryValidationResult = {
	page: number;
	limit: number;
	guideId?: string;
};

export async function EarningListQueryValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(earningListQuerySchema.safeParse(req.query), req, next);
}

export async function PayoutCreateValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(payoutCreateSchema.safeParse(req.body), req, next);
}

export async function PayoutListQueryValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(payoutListQuerySchema.safeParse(req.query), req, next);
}
