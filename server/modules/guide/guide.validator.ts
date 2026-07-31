import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import type { z } from 'zod';

import {
	contactInquirySchema,
	guideAdminNotesSchema,
	guideBankDetailsSchema,
	guidePricingSchema,
	guideProfilePatchSchema,
	guideProfileSchema,
	guideRejectSchema,
	membershipConfirmPaymentSchema,
} from './guide.schema';

/**
 * Express validator middleware for the guide module.
 *
 * The schemas now live in ./guide.schema.ts so the native Next Route Handlers
 * validate against the same objects during the migration. Behaviour is
 * unchanged: parse req.body, stash the result on req.locals.data, or flatten
 * zod's issues into a single comma-separated BadRequestError.
 */

export type GuideProfileValidationResult = {
	languages: string[];
	type: 'normal' | 'escort';
	phone: string;
	city: string;
	pan?: string;
};

export type GuideProfilePatchValidationResult = {
	phone?: string;
	city?: string;
	type?: 'normal' | 'escort';
	languages?: string[];
};

export type MembershipConfirmPaymentValidationResult = {
	transaction_id: string;
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};

export type ContactInquiryValidationResult = {
	fullName: string;
	phoneNumber: string;
	email: string;
	nationality: string;
	category: 'tour booking' | 'become a guide' | 'other';
	subject: string;
	message: string;
};

export type GuideRejectValidationResult = {
	reason: string;
};

export type GuideAdminNotesValidationResult = {
	notes: string;
};

export type GuidePricingValidationResult = {
	halfDay: number;
	fullDay: number;
};

export type GuideBankDetailsValidationResult = {
	accountHolderName?: string;
	accountNumber?: string;
	ifsc?: string;
	upiId?: string;
};

/** Shared tail: stash the parsed data, or turn zod's issues into one 400. */
function validate<T>(schema: z.ZodType<T>) {
	return async function validator(req: Request, _res: Response, next: NextFunction) {
		const result = schema.safeParse(req.body);

		if (result.success) {
			req.locals.data = result.data as object;
			return next();
		}

		const message = result.error.issues
			.map((err) => `${err.path.join('.')}: ${err.message}`)
			.join(', ');

		return next(new BadRequestError(message));
	};
}

export const GuideProfileValidator = validate(guideProfileSchema);
export const GuideProfilePatchValidator = validate(guideProfilePatchSchema);
export const MembershipConfirmPaymentValidator = validate(membershipConfirmPaymentSchema);
export const ContactInquiryValidator = validate(contactInquirySchema);
export const GuideRejectValidator = validate(guideRejectSchema);
export const GuideAdminNotesValidator = validate(guideAdminNotesSchema);
export const GuidePricingValidator = validate(guidePricingSchema);
export const GuideBankDetailsValidator = validate(guideBankDetailsSchema);
