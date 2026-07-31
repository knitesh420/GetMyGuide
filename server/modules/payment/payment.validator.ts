import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';

import { failedPaymentQuerySchema, webhookSchema } from './payment.schema';

export type { FailedPaymentQueryValidationResult, WebhookPayload } from './payment.schema';

/**
 * Express validator middleware for the payment module.
 *
 * The schemas now live in ./payment.schema.ts so the native Route Handlers
 * validate against the same objects. Behaviour unchanged — including the fact
 * that these two flatten zod issues DIFFERENTLY: the webhook joins bare
 * messages, the failed-payment query prefixes each with its field path. That
 * asymmetry is preserved rather than tidied, because the strings are what the
 * caller sees.
 */

export async function WebhookValidator(req: Request, _res: Response, next: NextFunction) {
	const result = webhookSchema.safeParse(req.body);

	if (!result.success) {
		const message = result.error.issues.map((i) => i.message).join(', ');
		return next(new BadRequestError(message));
	}

	req.locals.data = result.data;
	return next();
}

export async function FailedPaymentQueryValidator(req: Request, _res: Response, next: NextFunction) {
	const result = failedPaymentQuerySchema.safeParse(req.query);

	if (!result.success) {
		const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
		return next(new BadRequestError(message));
	}

	req.locals.data = result.data;
	return next();
}
