import { z } from 'zod';

/**
 * Zod schemas for the session (authentication) module.
 *
 * Extracted from session.validator.ts so the Express middleware and the native
 * Next Route Handlers validate against literally the same objects. Two copies
 * would drift, and a drifted auth validator is the kind of difference that only
 * shows up as a rejected login for one class of user.
 *
 * The schemas are unchanged from the originals — same rules, same messages.
 * Messages are part of the contract: the frontend surfaces them verbatim.
 */

const strongPassword = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[a-z]/, 'Password must contain a lowercase letter')
	.regex(/[A-Z]/, 'Password must contain an uppercase letter')
	.regex(/[0-9]/, 'Password must contain a number');

const email = z.string().email('Invalid email address').toLowerCase();

const otp = z
	.string()
	.length(6, 'OTP must be 6 digits')
	.regex(/^\d{6}$/, 'OTP must be numeric');

export const loginSchema = z.object({
	email,
	password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({ email });

export const sendOtpSchema = z.object({ email });

export const otpLoginSchema = z.object({ email, otp });

export const resetPasswordSchema = z.object({
	email,
	otp,
	newPassword: strongPassword,
});

export const registerSendOtpSchema = z
	.object({
		name: z.string().min(1, 'Name is required').trim(),
		email,
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

export const registerVerifyOtpSchema = z.object({ email, otp });
