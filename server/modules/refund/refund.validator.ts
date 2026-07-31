import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import {
	refundApproveSchema,
	refundListQuerySchema,
	refundRejectSchema,
	refundRequestSchema,
} from './refund.schema';

/**
 * Express validator middleware for the refund module.
 *
 * The schemas now live in ./refund.schema.ts so the native Route Handlers
 * validate against the same objects. Behaviour unchanged — still the shared
 * handleValidation tail, so the error format is the path-prefixed one.
 */

export type RefundRequestValidationResult = {
	bookingId: string;
	reason: string;
};

export type RefundApproveValidationResult = {
	approvedAmount: number;
	adminNote?: string;
};

export type RefundRejectValidationResult = {
	adminNote: string;
};

export type RefundListQueryValidationResult = {
	page: number;
	limit: number;
	status?: 'pending' | 'processed' | 'rejected' | 'failed';
};

export async function RefundRequestValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(refundRequestSchema.safeParse(req.body), req, next);
}

export async function RefundApproveValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(refundApproveSchema.safeParse(req.body), req, next);
}

export async function RefundRejectValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(refundRejectSchema.safeParse(req.body), req, next);
}

export async function RefundListQueryValidator(req: Request, _res: Response, next: NextFunction) {
	return handle(refundListQuerySchema.safeParse(req.query), req, next);
}
