import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

// ---- Guide profile (post-login, membership) --------------------------------

const stringArray = (label: string, required = false) =>
	z.preprocess(
		(val) => {
			if (val === undefined || val === null || val === '') return [];
			if (typeof val === 'string') {
				try {
					const parsed = JSON.parse(val);
					return Array.isArray(parsed) ? parsed : [parsed];
				} catch {
					return val
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean);
				}
			}
			return Array.isArray(val) ? val : [val];
		},
		required
			? z.array(z.string().trim().min(1)).min(1, `At least one ${label} is required`)
			: z.array(z.string().trim().min(1)).default([])
	);

/** Bare 10-digit national number; the country code is a separate Account field. */
const phoneSchema = z
	.string()
	.trim()
	.regex(/^\d{10}$/, 'Phone number must be exactly 10 digits');

const guideTypeSchema = z.enum(['normal', 'escort'], {
	message: 'Guide type must be either normal or escort',
});

export type GuideProfileValidationResult = {
	languages: string[];
	type: 'normal' | 'escort';
	phone: string;
	city: string;
	pan?: string;
};

export async function GuideProfileValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z
		.object({
			languages: stringArray('language', true),
			type: guideTypeSchema,
			phone: phoneSchema,
			city: z.string().trim().min(1, 'City is required'),
			pan: z.string().trim().optional(),
		})
		// PAN identifies escort guides for tax purposes; normal guides never supply it.
		.refine((data) => data.type !== 'escort' || !!data.pan, {
			message: 'PAN is required for escort guides',
			path: ['pan'],
		});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}

// ---- Guide profile PATCH (post-registration edits) -------------------------

export type GuideProfilePatchValidationResult = {
	phone?: string;
	city?: string;
	type?: 'normal' | 'escort';
	languages?: string[];
};

/**
 * Only phone, city, type and languages may change after registration. Unknown
 * keys are rejected outright rather than silently ignored, so a client that
 * tries to smuggle in `price` or `registrationCompleted` gets a 400 instead of
 * believing the edit went through.
 */
export async function GuideProfilePatchValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const reqValidator = z
		.object({
			phone: phoneSchema.optional(),
			city: z.string().trim().min(1, 'City cannot be empty').optional(),
			type: guideTypeSchema.optional(),
			languages: z
				.array(z.string().trim().min(1))
				.min(1, 'At least one language is required')
				.optional(),
		})
		.strict()
		.refine((data) => Object.keys(data).length > 0, {
			message: 'Provide at least one of: phone, city, type, languages',
		});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}

export type MembershipConfirmPaymentValidationResult = {
	transaction_id: string;
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};

export async function MembershipConfirmPaymentValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const reqValidator = z.object({
		transaction_id: z.string().trim().min(1, 'Transaction ID is required'),
		razorpay_order_id: z.string().trim().min(1, 'Razorpay order ID is required'),
		razorpay_payment_id: z.string().trim().min(1, 'Razorpay payment ID is required'),
		razorpay_signature: z.string().trim().min(1, 'Razorpay signature is required'),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}

export type ContactInquiryValidationResult = {
	fullName: string;
	phoneNumber: string;
	email: string;
	nationality: string;
	category: 'tour booking' | 'become a guide' | 'other';
	subject: string;
	message: string;
};

export async function ContactInquiryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		fullName: z.string().trim().min(1, 'Full name is required'),
		phoneNumber: z.string().trim().min(1, 'Phone number is required'),
		email: z.string().trim().email('Invalid email format'),
		nationality: z.string().trim().min(1, 'Nationality is required'),
		category: z.enum(['tour booking', 'become a guide', 'other'], {
			message: 'Category must be either "tour booking", "become a guide", or "other"',
		}),
		subject: z.string().trim().min(1, 'Subject is required'),
		message: z.string().trim().min(10, 'Message must be at least 10 characters long'),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}
