import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { paymentVerifySchema } from './tourguide.schema';

// Note there is deliberately no `totalPrice` here. The price is derived from the
// guide's published rate on the server; accepting it from the client would let a
// tourist name their own price.
const directBookingShape = {
	guideId: z.string().trim().min(1, 'guideId is required'),
	location: z.string().trim().min(1, 'location is required').max(200),
	language: z.string().trim().max(100).optional().default(''),
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	numberOfTravelers: z.coerce.number().int().positive().max(100).default(1),
};

export type TourGuideCreateOrderValidationResult = {
	guideId: string;
	location: string;
	language: string;
	startDate: Date;
	endDate: Date;
	numberOfTravelers: number;
};

export async function TourGuideCreateOrderValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object(directBookingShape);
	return handle(validator.safeParse(req.body), req, next);
}

export type TourGuideQuoteValidationResult = {
	guideId: string;
	startDate: Date;
	endDate: Date;
};

export async function TourGuideQuoteValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		guideId: z.string().trim().min(1, 'guideId is required'),
		startDate: z.coerce.date(),
		endDate: z.coerce.date(),
	});

	return handle(validator.safeParse(req.query), req, next);
}

export type TourGuideVerifyValidationResult = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
	booking_data: string;
};

export async function TourGuideVerifyValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		razorpay_order_id: z.string().trim().min(1),
		razorpay_payment_id: z.string().trim().min(1),
		razorpay_signature: z.string().trim().min(1),
		booking_data: z.string().trim().min(1),
	});

	return handle(validator.safeParse(req.body), req, next);
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
	const validator = z.object({
		status: z.enum(['Upcoming', 'Completed']),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type TourGuideCancelValidationResult = {
	reason: string;
};

export async function TourGuideCancelValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		reason: z.string().trim().min(5, 'Please give a reason of at least 5 characters').max(2000),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type TourGuideReassignValidationResult = {
	newGuideId: string;
};

export async function TourGuideReassignValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		newGuideId: z.string().trim().min(1, 'newGuideId is required'),
	});

	return handle(validator.safeParse(req.body), req, next);
}

export type TourGuideListQueryValidationResult = {
	page: number;
	limit: number;
};

export async function TourGuideListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const validator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
	});

	return handle(validator.safeParse(req.query), req, next);
}
