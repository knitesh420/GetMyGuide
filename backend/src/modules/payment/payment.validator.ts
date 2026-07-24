import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

// --- Webhook payload validator ---

const WebhookSchema = z.object({
	event: z.string().min(1, 'Event type is required'),
	payload: z.object({
		payment: z.object({
			entity: z.object({
				id: z.string().min(1),
				order_id: z.string().min(1),
			}),
		}),
	}),
});

export type WebhookPayload = z.infer<typeof WebhookSchema>;

export async function WebhookValidator(req: Request, _res: Response, next: NextFunction) {
	const result = WebhookSchema.safeParse(req.body);

	if (!result.success) {
		const message = result.error.issues.map((i) => i.message).join(', ');
		return next(new BadRequestError(message));
	}

	req.locals.data = result.data;
	return next();
}

// --- Admin failed-payments list ---

const FailedPaymentQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(['failed', 'pending_verification']).optional(),
	referenceType: z.string().trim().min(1).optional(),
	search: z.string().trim().optional(),
	from: z.string().trim().optional(),
	to: z.string().trim().optional(),
});

export type FailedPaymentQueryValidationResult = z.infer<typeof FailedPaymentQuerySchema>;

export async function FailedPaymentQueryValidator(req: Request, _res: Response, next: NextFunction) {
	const result = FailedPaymentQuerySchema.safeParse(req.query);

	if (!result.success) {
		const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
		return next(new BadRequestError(message));
	}

	req.locals.data = result.data;
	return next();
}
