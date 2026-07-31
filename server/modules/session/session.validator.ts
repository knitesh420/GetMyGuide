import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import type { z } from 'zod';

import {
	forgotPasswordSchema,
	loginSchema,
	otpLoginSchema,
	registerSendOtpSchema,
	registerVerifyOtpSchema,
	resetPasswordSchema,
	sendOtpSchema,
} from './session.schema';

/**
 * Express validator middleware for the session module.
 *
 * The schemas themselves now live in ./session.schema.ts so the native Next
 * Route Handlers can validate against the same objects during the migration —
 * two copies of an auth validator would drift, and a drifted one shows up as a
 * rejected login for one class of user rather than as a test failure.
 *
 * Behaviour is unchanged: parse req.body, stash the result on req.locals.data,
 * or flatten zod's issues into a single comma-separated BadRequestError. That
 * message format is part of the contract — the frontend renders it verbatim.
 */

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

export type SendOtpValidationResult = {
	email: string;
};

export type OtpLoginValidationResult = {
	email: string;
	otp: string;
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

export const LoginValidator = validate(loginSchema);
export const ForgotPasswordValidator = validate(forgotPasswordSchema);
export const SendOtpValidator = validate(sendOtpSchema);
export const OtpLoginValidator = validate(otpLoginSchema);
export const ResetPasswordValidator = validate(resetPasswordSchema);
export const RegisterSendOtpValidator = validate(registerSendOtpSchema);
export const RegisterVerifyOtpValidator = validate(registerVerifyOtpSchema);
