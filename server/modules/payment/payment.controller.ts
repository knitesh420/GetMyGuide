import PaymentService from '@services/payment';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError, ServerError } from 'node-be-utilities';
import { Respond } from '@utils/respond';
import { FailedPaymentQueryValidationResult } from './payment.validator';
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

/**
 * GET /payment/admin/failed
 * Payments that were declined, or that cleared but whose follow-up bookkeeping
 * was abandoned. Admin-only — these rows carry customer contact details.
 */
async function listFailed(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, ...filters } = req.locals.data as FailedPaymentQueryValidationResult;
		const result = await PaymentService.listFailedPayments(filters, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

/**
 * GET /payment/my-failed
 * The signed-in user's own unsuccessful payments. Any role — a guide sees
 * declined membership fees, a tourist sees declined bookings.
 */
async function listMyFailed(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await PaymentService.listMyFailedPayments(req.locals.user!.userId);

		// Respond() spreads its payload onto the response root, so a bare array
		// would serialise as {0:…, 1:…}. Wrap it, as every other list route does.
		return Respond({ res, status: 200, data: { data: result } });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	handleWebhook,
	listFailed,
	listMyFailed,
};

export default Controller;
