import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import {
	tripCancelSchema,
	tripCompleteSchema,
	tripListQuerySchema,
	tripMyQuerySchema,
	tripStartSchema,
} from './trip.schema';

/**
 * The schemas themselves live in `trip.schema.ts`, shared with the native Route
 * Handlers in `app/api/trip/`. These wrappers exist only to keep the Express
 * middleware signature while both implementations are mounted.
 */

export type TripStartValidationResult = {
	notes?: string;
};

export async function TripStartValidator(req: Request, res: Response, next: NextFunction) {
	return handle(tripStartSchema.safeParse(req.body), req, next);
}

export type TripCompleteValidationResult = {
	completionNotes?: string;
};

export async function TripCompleteValidator(req: Request, res: Response, next: NextFunction) {
	return handle(tripCompleteSchema.safeParse(req.body), req, next);
}

export type TripCancelValidationResult = {
	reason?: string;
};

export async function TripCancelValidator(req: Request, res: Response, next: NextFunction) {
	return handle(tripCancelSchema.safeParse(req.body), req, next);
}

export type TripListQueryValidationResult = {
	page: number;
	limit: number;
	status?: string;
	guideId?: string;
};

export async function TripListQueryValidator(req: Request, res: Response, next: NextFunction) {
	return handle(tripListQuerySchema.safeParse(req.query), req, next);
}

export type TripMyQueryValidationResult = {
	page: number;
	limit: number;
	status?: string;
};

export async function TripMyQueryValidator(req: Request, res: Response, next: NextFunction) {
	return handle(tripMyQuerySchema.safeParse(req.query), req, next);
}
