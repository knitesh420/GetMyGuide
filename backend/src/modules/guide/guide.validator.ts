import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type EnrollValidationResult = {
	name: string;
	email: string;
	phone: string;
	city: string;
	type: 'normal' | 'escort';
	pan?: string;
	languages: string[];
};

export async function EnrollValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		name: z.string().trim().min(1, 'Name is required'),
		email: z.string().trim().email('Invalid email format'),
		phone: z.string().trim().min(1, 'Phone is required'),
		city: z.string().trim().min(1, 'City is required'),
		type: z.enum(['normal', 'escort'], {
			message: 'Type must be either normal or escort',
		}),
		pan: z.string().trim().optional(),
		languages: z
			.preprocess(
				(val) => {
					if (typeof val === 'string') {
						try {
							return JSON.parse(val);
						} catch {
							return val.split(',').map((s) => s.trim());
						}
					}
					return Array.isArray(val) ? val : [val];
				},
				z.array(z.string().trim().min(1)).min(1, 'At least one language is required')
			)
			.transform((val) => (Array.isArray(val) ? val : [val])),
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

export type ConfirmPaymentValidationResult = {
	transaction_id: string;
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
	enrollment_data: string;
};

export async function ConfirmPaymentValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		transaction_id: z.string().trim().min(1, 'Transaction ID is required'),
		razorpay_order_id: z.string().trim().min(1, 'Razorpay order ID is required'),
		razorpay_payment_id: z.string().trim().min(1, 'Razorpay payment ID is required'),
		razorpay_signature: z.string().trim().min(1, 'Razorpay signature is required'),
		enrollment_data: z.string().trim().min(1, 'Enrollment data is required'),
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

export type GuideProfileValidationResult = {
	languages: string[];
	experience: string;
	city: string;
	state: string;
	country: string;
	price: number;
	about: string;
	specialization: string[];
	availableDays: string[];
	availableTime: string;
};

export async function GuideProfileValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		languages: stringArray('language', true),
		experience: z.string().trim().min(1, 'Experience is required'),
		city: z.string().trim().min(1, 'City is required'),
		state: z.string().trim().min(1, 'State is required'),
		country: z.string().trim().min(1, 'Country is required'),
		price: z.coerce.number().positive('Price must be a positive number'),
		about: z.string().trim().min(1, 'About is required'),
		specialization: stringArray('specialization'),
		availableDays: stringArray('available day', true),
		availableTime: z.string().trim().min(1, 'Available time is required'),
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
