import { z } from 'zod';

/**
 * Zod schemas for the guide module.
 *
 * Extracted verbatim from guide.validator.ts so the Express middleware and the
 * native Next Route Handlers validate against the same objects. Rules and
 * messages are unchanged — the frontend renders the messages directly.
 */

/**
 * Accepts a JSON array, a comma-separated string, or a bare value.
 *
 * The registration form arrives as multipart, where every field is a string, so
 * `languages` can turn up as '["en","hi"]' or 'en,hi' depending on the client.
 */
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

export const guideProfileSchema = z
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

/**
 * Only phone, city, type and languages may change after registration. Unknown
 * keys are rejected outright rather than silently ignored, so a client that
 * tries to smuggle in `price` or `registrationCompleted` gets a 400 instead of
 * believing the edit went through.
 */
export const guideProfilePatchSchema = z
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

export const membershipConfirmPaymentSchema = z.object({
	transaction_id: z.string().trim().min(1, 'Transaction ID is required'),
	razorpay_order_id: z.string().trim().min(1, 'Razorpay order ID is required'),
	razorpay_payment_id: z.string().trim().min(1, 'Razorpay payment ID is required'),
	razorpay_signature: z.string().trim().min(1, 'Razorpay signature is required'),
});

export const contactInquirySchema = z.object({
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

export const guideRejectSchema = z.object({
	// The guide is told this verbatim, so it has to actually say something.
	reason: z
		.string()
		.trim()
		.min(10, 'Tell the guide what was wrong with their documents (at least 10 characters)')
		.max(2000),
});

/**
 * Internal notes an admin keeps on a guide. An empty string is valid and means
 * "clear the notes" — a notepad you cannot erase is a bad notepad.
 */
export const guideAdminNotesSchema = z.object({
	notes: z.string().trim().max(5000, 'Notes cannot exceed 5000 characters'),
});

export const guidePricingSchema = z.object({
	halfDay: z.coerce.number().min(0, 'Half-day rate cannot be negative'),
	// Direct bookings are priced off this, so a zero rate would mean free trips.
	fullDay: z.coerce.number().positive('Enter your full-day rate'),
});

export const guideBankDetailsSchema = z
	.object({
		accountHolderName: z.string().trim().min(2).max(200).optional(),
		accountNumber: z
			.string()
			.trim()
			.regex(/^\d{6,20}$/, 'Enter a valid account number')
			.optional(),
		ifsc: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code')
			.optional(),
		upiId: z
			.string()
			.trim()
			.regex(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, 'Enter a valid UPI ID')
			.optional(),
	})
	// A payout has to be sendable somewhere: bank details or a UPI ID, not neither.
	.refine((data) => (data.accountNumber && data.ifsc) || data.upiId, {
		message: 'Provide either an account number with IFSC, or a UPI ID',
	});
