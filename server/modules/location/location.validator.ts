import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

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

/**
 * The admin panel posts multipart, so every field arrives as a string — "false"
 * included, which `z.coerce.boolean()` would read as true. Parse the flag by
 * hand instead of coercing.
 */
const multipartBoolean = z
	.union([z.boolean(), z.string()])
	.transform((value) => (typeof value === 'boolean' ? value : value.toLowerCase() === 'true'));

export async function LocationCreateValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		name: z.string().trim().min(2, 'Name is required').max(200),
		city: z.string().trim().min(2, 'City is required').max(120),
		state: z.string().trim().max(120).optional(),
		country: z.string().trim().max(120).default('India'),
		description: z.string().trim().max(5000).optional(),
		// The image arrives as an uploaded file, not a field; the controller pushes
		// it to Cloudinary and sets the URL. A caller may still pass one directly.
		image: z.string().trim().url('Image must be a URL').optional(),
		isActive: multipartBoolean.default(true),
		isPopular: multipartBoolean.default(false),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type LocationUpdateValidationResult = Partial<LocationCreateValidationResult>;

export async function LocationUpdateValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		name: z.string().trim().min(2).max(200).optional(),
		city: z.string().trim().min(2).max(120).optional(),
		state: z.string().trim().max(120).optional(),
		country: z.string().trim().max(120).optional(),
		description: z.string().trim().max(5000).optional(),
		image: z.string().trim().url('Image must be a URL').optional(),
		isActive: multipartBoolean.optional(),
		isPopular: multipartBoolean.optional(),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type LocationListQueryValidationResult = {
	city?: string;
	popular?: boolean;
	search?: string;
};

export async function LocationListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		city: z.string().trim().optional(),
		popular: z.coerce.boolean().optional(),
		search: z.string().trim().optional(),
	});

	return handle(validator.safeParse(req.query), req, next);
}
