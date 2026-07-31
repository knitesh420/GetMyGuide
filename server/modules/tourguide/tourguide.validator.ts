import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import {
	cancelSchema,
	createOrderSchema,
	listQuerySchema,
	paymentVerifySchema,
	quoteSchema,
	reassignSchema,
	statusSchema,
	verifyAndCreateSchema,
} from './tourguide.schema';

/**
 * The schemas themselves live in `tourguide.schema.ts`, shared with the native
 * Route Handlers in `app/api/tourguide/`. These wrappers exist only to keep the
 * Express middleware signature while both implementations are mounted.
 */

export type TourGuideCreateOrderValidationResult = {
	guideId: string;
	location: string;
	language: string;
	startDate: Date;
	endDate: Date;
	numberOfTravelers: number;
};

export async function TourGuideCreateOrderValidator(req: Request, res: Response, next: NextFunction) {
	return handle(createOrderSchema.safeParse(req.body), req, next);
}

export type TourGuideQuoteValidationResult = {
	guideId: string;
	startDate: Date;
	endDate: Date;
};

export async function TourGuideQuoteValidator(req: Request, res: Response, next: NextFunction) {
	return handle(quoteSchema.safeParse(req.query), req, next);
}

export type TourGuideVerifyValidationResult = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
	booking_data: string;
};

export async function TourGuideVerifyValidator(req: Request, res: Response, next: NextFunction) {
	return handle(verifyAndCreateSchema.safeParse(req.body), req, next);
}

export type PaymentVerifyValidationResult = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};

export async function PaymentVerifyValidator(req: Request, res: Response, next: NextFunction) {
	// Shared with POST /booking/:id/balance/verify, which mounts this middleware
	// directly — hence the schema lives in tourguide.schema.ts rather than here.
	return handle(paymentVerifySchema.safeParse(req.body), req, next);
}

export type TourGuideStatusValidationResult = {
	status: 'Upcoming' | 'Completed';
};

export async function TourGuideStatusValidator(req: Request, res: Response, next: NextFunction) {
	return handle(statusSchema.safeParse(req.body), req, next);
}

export type TourGuideCancelValidationResult = {
	reason: string;
};

export async function TourGuideCancelValidator(req: Request, res: Response, next: NextFunction) {
	return handle(cancelSchema.safeParse(req.body), req, next);
}

export type TourGuideReassignValidationResult = {
	newGuideId: string;
};

export async function TourGuideReassignValidator(req: Request, res: Response, next: NextFunction) {
	return handle(reassignSchema.safeParse(req.body), req, next);
}

export type TourGuideListQueryValidationResult = {
	page: number;
	limit: number;
};

export async function TourGuideListQueryValidator(req: Request, res: Response, next: NextFunction) {
	return handle(listQuerySchema.safeParse(req.query), req, next);
}
