import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';
import {
	locationCreateSchema,
	locationListQuerySchema,
	locationUpdateSchema,
} from './location.schema';

/**
 * The schemas themselves now live in ./location.schema.ts so the native Route
 * Handlers can share them. These wrappers keep the Express middleware signature
 * for as long as the adapter still serves this module.
 */

export type LocationCreateValidationResult = {
	name: string;
	city: string;
	state?: string;
	country: string;
	description?: string;
	image?: string;
	isActive: boolean;
	isPopular: boolean;
};

export async function LocationCreateValidator(req: Request, res: Response, next: NextFunction) {
	return handle(locationCreateSchema.safeParse(req.body), req, next);
}

export type LocationUpdateValidationResult = Partial<LocationCreateValidationResult>;

export async function LocationUpdateValidator(req: Request, res: Response, next: NextFunction) {
	return handle(locationUpdateSchema.safeParse(req.body), req, next);
}

export type LocationListQueryValidationResult = {
	city?: string;
	popular?: boolean;
	search?: string;
};

export async function LocationListQueryValidator(req: Request, res: Response, next: NextFunction) {
	return handle(locationListQuerySchema.safeParse(req.query), req, next);
}
