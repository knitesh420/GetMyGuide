import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type CreatePackageValidationResult = {
	title: string;
	city: string;
	places: string[];
};

export async function CreatePackageValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		title: z.string().trim().min(1, 'Title is required'),
		city: z.string().trim().min(1, 'City is required'),
		places: z
			.preprocess(
				(val) => {
					if (typeof val === 'string') {
						try {
							return JSON.parse(val);
						} catch {
							return val.split(',').map((s) => s.trim());
						}
					}
					return Array.isArray(val) ? val : [val];
				},
				z.array(z.string().trim().min(1)).min(1, 'At least one place is required')
			)
			.transform((val) => (Array.isArray(val) ? val : [val])),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}

export type UpdatePackageValidationResult = {
	title?: string;
	city?: string;
	places?: string[];
};

export async function UpdatePackageValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		title: z.string().trim().min(1, 'Title is required').optional(),
		city: z.string().trim().min(1, 'City is required').optional(),
		places: z
			.preprocess(
				(val) => {
					if (typeof val === 'string') {
						try {
							return JSON.parse(val);
						} catch {
							return val.split(',').map((s) => s.trim());
						}
					}
					return Array.isArray(val) ? val : [val];
				},
				z.array(z.string().trim().min(1)).min(1, 'At least one place is required').optional()
			)
			.optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}

export type UpdateStatusValidationResult = {
	status: 'inactive' | 'active';
};

export async function UpdateStatusValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		status: z.enum(['inactive', 'active'], {
			message: 'Status must be either inactive or active',
		}),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}
