import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type SignupValidationResult = {
	name: string;
	email: string;
	phone: string;
	password: string;
};

export type LoginValidationResult = {
	email: string;
	password: string;
};

export type ForgotPasswordValidationResult = {
	email: string;
};

export type ResetPasswordValidationResult = {
	token: string;
	password: string;
};

export async function SignupValidator(req: Request, res: Response, next: NextFunction) {
	// Note: `role` is intentionally NOT accepted here. Public signup always
	// creates a tourist; admin/guide accounts are provisioned by seed scripts
	// or protected internal endpoints.
	const reqValidator = z.object({
		name: z.string().min(1, 'Name is required').trim(),
		email: z.string().email('Invalid email address').toLowerCase(),
		phone: z.string().min(1, 'Phone is required').trim(),
		password: z.string().min(8, 'Password must be at least 8 characters'),
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
		token: z.string().min(1, 'Reset token is required'),
		password: z.string().min(6, 'Password must be at least 6 characters'),
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
