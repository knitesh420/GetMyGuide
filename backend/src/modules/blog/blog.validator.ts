import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type CreateBlogValidationResult = {
	description: string;
	hasImage: boolean;
};

export async function CreateBlogValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		description: z.string().trim().min(1, 'Description is required'),
		hasImage: z
			.preprocess(
				(val) => {
					if (typeof val === 'string') {
						if (val === 'true') return true;
						if (val === 'false') return false;
						// Return the string as-is for invalid values so zod validation fails
						return val;
					}
					return val;
				},
				z.union([z.boolean(), z.literal('true'), z.literal('false')]).transform((val) => {
					if (typeof val === 'string') {
						return val === 'true';
					}
					return val;
				})
			)
			.default(false),
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
