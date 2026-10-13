import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { cleanupGuideProfileUploads } from '../guide/guide.middleware';
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

type RegistrationData = {
	name: string;
	email: string;
	phone: string;
	countryCode: string;
	password: string;
	accountType: 'tourist' | 'guide';
	city?: string;
	type?: 'normal' | 'escort';
	languages?: string[];
	pan?: string;
	guideDraft?: {
		city: string;
		type: 'normal' | 'escort';
		languages: string[];
		pan?: string;
		profileImage: string;
		identityProofs: string[];
	};
};

export type RegisterSendOtpValidationResult =
	| (RegistrationData & { resendOnly?: false })
	| { email: string; resendOnly: true };

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
	if (
		req.body &&
		typeof req.body.email === 'string' &&
		Object.keys(req.body).every((key) => key === 'email')
	) {
		const resendResult = z
			.object({ email: z.string().email('Invalid email address').toLowerCase() })
			.safeParse(req.body);
		if (resendResult.success) {
			try {
				await cleanupGuideProfileUploads(req);
			} catch (error) {
				return next(error);
			}
			req.locals.data = { email: resendResult.data.email, resendOnly: true };
			return next();
		}
		try {
			await cleanupGuideProfileUploads(req);
		} catch (error) {
			return next(error);
		}
		return next(new BadRequestError('Invalid email address'));
	}

	const reqValidator = z
		.object({
			name: z.string().trim().min(1, 'Name is required'),
			email: z.string().email('Invalid email address').toLowerCase(),
			phone: z.string().trim().min(1, 'Phone number is required'),
			countryCode: z.string().trim().min(1, 'Country code is required'),
			password: strongPassword,
			confirmPassword: z.string().optional(),
			accountType: z.enum(['tourist', 'guide'], {
				message: "Account type must be 'tourist' or 'guide'",
			}),
			city: z.string().trim().min(1, 'City is required').optional(),
			type: z.enum(['normal', 'escort'], {
				message: 'Guide type must be either normal or escort',
			}).optional(),
			languages: z.preprocess(
				(value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
				z.array(z.string().trim().min(1)).min(1, 'At least one language is required').optional()
			),
			pan: z.string().trim().optional(),
		})
		.refine((data) => !data.confirmPassword || data.confirmPassword === data.password, {
			message: 'Passwords do not match',
			path: ['confirmPassword'],
		})
		.superRefine((data, ctx) => {
			if (data.accountType !== 'guide') return;
			if (!/^\d{10}$/.test(data.phone)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['phone'],
					message: 'Phone number must be exactly 10 digits',
				});
			}
			if (!data.city) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['city'],
					message: 'City is required for guide registration',
				});
			}
			if (!data.type) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['type'],
					message: 'Guide type is required for guide registration',
				});
			}
			if (!data.languages || data.languages.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['languages'],
					message: 'At least one language is required for guide registration',
				});
			}
			if (data.type === 'escort' && !data.pan) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['pan'],
					message: 'PAN is required for escort guide registration',
				});
			}
			const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
			if (!req.is('multipart/form-data') || files?.profileImage?.length !== 1) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['profileImage'],
					message: 'Profile photo is required for guide registration',
				});
			}
			if (files?.identityProofs?.length !== 2) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['identityProofs'],
					message: 'A guide licence and Aadhaar document are required',
				});
			}
		});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		if (reqValidatorResult.data.accountType !== 'guide') {
			try {
				await cleanupGuideProfileUploads(req);
			} catch (error) {
				return next(error);
			}
		}
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	try {
		await cleanupGuideProfileUploads(req);
	} catch (error) {
		return next(error);
	}
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
