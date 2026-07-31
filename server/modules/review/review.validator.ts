import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import {
	reviewCreateSchema,
	reviewHideSchema,
	reviewListQuerySchema,
	reviewMyQuerySchema,
} from './review.schema';

/**
 * The schemas themselves live in `review.schema.ts`, shared with the native
 * Route Handlers in `app/api/review/`. These wrappers exist only to keep the
 * Express middleware signature while both implementations are mounted.
 */

export type ReviewCreateValidationResult = {
	bookingId: string;
	rating: number;
	comment?: string;
};

export async function ReviewCreateValidator(req: Request, res: Response, next: NextFunction) {
	return handle(reviewCreateSchema.safeParse(req.body), req, next);
}

export type ReviewHideValidationResult = {
	isHidden: boolean;
};

export async function ReviewHideValidator(req: Request, res: Response, next: NextFunction) {
	return handle(reviewHideSchema.safeParse(req.body), req, next);
}

export type ReviewListQueryValidationResult = {
	page: number;
	limit: number;
	guideId?: string;
	minRating?: number;
	isHidden?: boolean;
};

export async function ReviewListQueryValidator(req: Request, res: Response, next: NextFunction) {
	return handle(reviewListQuerySchema.safeParse(req.query), req, next);
}

export type ReviewMyQueryValidationResult = {
	page: number;
	limit: number;
};

export async function ReviewMyQueryValidator(req: Request, res: Response, next: NextFunction) {
	return handle(reviewMyQuerySchema.safeParse(req.query), req, next);
}
