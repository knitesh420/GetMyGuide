import { z } from 'zod';

/**
 * Zod schemas for the payment module.
 *
 * Extracted from payment.validator.ts so the Express middleware and the native
 * Route Handler share one definition.
 */

export const webhookSchema = z.object({
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

export type WebhookPayload = z.infer<typeof webhookSchema>;

export const failedPaymentQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(['failed', 'pending_verification']).optional(),
	referenceType: z.string().trim().min(1).optional(),
	search: z.string().trim().optional(),
	from: z.string().trim().optional(),
	to: z.string().trim().optional(),
});

export type FailedPaymentQueryValidationResult = z.infer<typeof failedPaymentQuerySchema>;
