import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

const strongPassword = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[a-z]/, 'Password must contain a lowercase letter')
	.regex(/[A-Z]/, 'Password must contain an uppercase letter')
	.regex(/[0-9]/, 'Password must contain a number');


export type LoginValidationResult = {
	email: string;
	password: string;
};

export type ForgotPasswordValidationResult = {
	email: string;
};

export type ResetPasswordValidationResult = {
	email: string;
	otp: string;
	newPassword: string;
};

export type RegisterSendOtpValidationResult = {
	name: string;
	email: string;
	phone: string;
	countryCode: string;
	password: string;
	accountType: 'tourist' | 'guide';
};

export type RegisterVerifyOtpValidationResult = {
	email: string;
	otp: string;
};


export async function LoginValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		email: z.string().email('Invalid email address').toLowerCase(),
		password: z.string().min(1, 'Password is required'),
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

export async function ForgotPasswordValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		email: z.string().email('Invalid email address').toLowerCase(),
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

export type SendOtpValidationResult = {
	email: string;
};

export type OtpLoginValidationResult = {
	email: string;
	otp: string;
};

export async function SendOtpValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		email: z.string().email('Invalid email address').toLowerCase(),
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

export async function OtpLoginValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		email: z.string().email('Invalid email address').toLowerCase(),
		otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
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

export async function ResetPasswordValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		email: z.string().email('Invalid email address').toLowerCase(),
		otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
		newPassword: strongPassword,
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

// Registration OTP flow --------------------------------------------------

export async function RegisterSendOtpValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z
		.object({
			name: z.string().min(1, 'Name is required').trim(),
			email: z.string().email('Invalid email address').toLowerCase(),
			phone: z.string().min(1, 'Phone number is required').trim(),
			countryCode: z.string().min(1, 'Country code is required').trim(),
			password: strongPassword,
			confirmPassword: z.string().optional(),
			accountType: z.enum(['tourist', 'guide'], {
				message: "Account type must be 'tourist' or 'guide'",
			}),
		})
		.refine((data) => !data.confirmPassword || data.confirmPassword === data.password, {
			message: 'Passwords do not match',
			path: ['confirmPassword'],
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

export async function RegisterVerifyOtpValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		email: z.string().email('Invalid email address').toLowerCase(),
		otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
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
