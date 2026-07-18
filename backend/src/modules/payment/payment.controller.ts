import PaymentService from '@services/payment';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError, ServerError } from 'node-be-utilities';
import { Respond } from '@utils/respond';
/**
 * POST /payment/webhook
 * Handles Razorpay webhook events.
 */
async function handleWebhook(req: Request, res: Response, next: NextFunction) {
	try {
		const signature = req.headers['x-razorpay-signature'] as string;

		if (!signature) {
			return next(new BadRequestError('Missing x-razorpay-signature header'));
		}

		// Razorpay carries the event identifier in this header — never in the body.
		// It is what makes retry-deduplication possible, so a delivery without it
		// cannot be processed safely.
		const eventId = req.headers['x-razorpay-event-id'] as string;

		if (!eventId) {
			return next(new BadRequestError('Missing x-razorpay-event-id header'));
		}

		// Use raw body for signature verification
		const rawBody = (req as any).rawBody as Buffer;
		if (!rawBody) {
			return next(new ServerError('Raw body not available for signature verification'));
		}

		// Verify webhook signature
		const isValid = PaymentService.verifyWebhookSignature(rawBody, signature);
		if (!isValid) {
			return next(new BadRequestError('Invalid webhook signature'));
		}

		// Process the webhook event
		const result = await PaymentService.handleWebhookEvent(req.body, eventId);

		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	handleWebhook,
};

export default Controller;
