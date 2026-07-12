import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export type MessageSendValidationResult = {
	body: string;
};

export async function MessageSendValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		body: z.string().trim().min(1, 'Message cannot be empty').max(4000),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type MessageThreadQueryValidationResult = {
	after?: string;
	limit: number;
};

export async function MessageThreadQueryValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		// The client's newest known message id — the poll cursor.
		after: z
			.string()
			.trim()
			.regex(/^[a-f\d]{24}$/i, 'after must be a message id')
			.optional(),
		limit: z.coerce.number().int().positive().max(100).default(50),
	});

	return handle(validator.safeParse(req.query), req, next);
}

export type MessageThreadListQueryValidationResult = {
	page: number;
	limit: number;
};

export async function MessageThreadListQueryValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const validator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
	});

	return handle(validator.safeParse(req.query), req, next);
}
