import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type CreatePackageValidationResult = {
	title: string;
	city: string;
	places: string[];
	price?: number;
	shortDescription?: string;
	numberOfPeople?: number;
	numberOfDays?: number;
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
		price: z.preprocess(
			(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
			z.number().min(0, 'Price must be a positive number').optional()
		),
		shortDescription: z.string().trim().optional(),
		numberOfPeople: z.preprocess(
			(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
			z.number().int().min(1, 'Number of people must be at least 1').optional()
		),
		numberOfDays: z.preprocess(
			(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
			z.number().int().min(1, 'Number of days must be at least 1').optional()
		),
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
	price?: number;
	shortDescription?: string;
	description?: string;
	numberOfPeople?: number;
	numberOfDays?: number;
	inclusions?: string[];
	exclusions?: string[];
	featured?: boolean;
	status?: 'inactive' | 'active';
};

const stringArrayPreprocess = (val: unknown) => {
	if (val === undefined || val === null || val === '') return undefined;
	if (typeof val === 'string') {
		try {
			const parsed = JSON.parse(val);
			return Array.isArray(parsed) ? parsed : [parsed];
		} catch {
			return val.split(',').map((s) => s.trim());
		}
	}
	return Array.isArray(val) ? val : [val];
};

const booleanPreprocess = (val: unknown) => {
	if (val === undefined || val === null || val === '') return undefined;
	if (typeof val === 'boolean') return val;
	if (typeof val === 'string') {
		if (val === 'true') return true;
		if (val === 'false') return false;
	}
	return val;
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
		price: z.preprocess(
			(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
			z.number().min(0, 'Price must be a positive number').optional()
		),
		shortDescription: z.string().trim().optional(),
		description: z.string().trim().optional(),
		numberOfPeople: z.preprocess(
			(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
			z.number().int().min(1, 'Number of people must be at least 1').optional()
		),
		numberOfDays: z.preprocess(
			(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
			z.number().int().min(1, 'Number of days must be at least 1').optional()
		),
		inclusions: z.preprocess(
			stringArrayPreprocess,
			z.array(z.string().trim().min(1)).optional()
		),
		exclusions: z.preprocess(
			stringArrayPreprocess,
			z.array(z.string().trim().min(1)).optional()
		),
		featured: z.preprocess(booleanPreprocess, z.boolean().optional()),
		status: z
			.enum(['inactive', 'active'], {
				message: 'Status must be either inactive or active',
			})
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
