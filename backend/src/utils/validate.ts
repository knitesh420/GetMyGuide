import { NextFunction, Request } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

/**
 * The result shape of `schema.safeParse`, written out by hand rather than
 * imported: zod v4 removed the `SafeParseReturnType` alias that v3 exported, and
 * this keeps the helper working across both.
 */
type SafeParseResult<T> = { success: true; data: T } | { success: false; error: z.ZodError };

/**
 * Shared tail of every validator middleware: stash the parsed data on
 * `req.locals.data` for the controller, or turn zod's issues into one 400.
 */
export function handleValidation<T>(
	result: SafeParseResult<T>,
	req: Request,
	next: NextFunction
): void {
	if (result.success) {
		req.locals.data = result.data as object;
		return next();
	}

	const message = result.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}
