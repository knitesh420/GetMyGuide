import { z } from 'zod';

/**
 * Zod schema for the lead module's public contact form.
 *
 * Extracted from lead.validator.ts so the Express middleware and the native
 * Route Handler share one definition.
 */
export const createContactInquirySchema = z.object({
	fullName: z
		.string()
		.trim()
		.min(2, 'Name must be at least 2 characters')
		.max(100, 'Name must not exceed 100 characters'),

	email: z.string().email('Invalid email address').trim().toLowerCase(),

	phoneNumber: z
		.string()
		.trim()
		.min(10, 'Phone number must be at least 10 digits')
		.max(15, 'Phone number must not exceed 15 digits')
		.regex(/^[+]?[\d\s()-]+$/, 'Invalid phone number format'),

	nationality: z
		.string()
		.trim()
		.min(2, 'Nationality must be at least 2 characters')
		.max(50, 'Nationality must not exceed 50 characters'),

	category: z.enum(['tour booking', 'become a guide', 'service', 'other']),

	serviceName: z.string().trim().max(200, 'Service name must not exceed 200 characters').optional(),

	subject: z
		.string()
		.trim()
		.min(5, 'Subject must be at least 5 characters')
		.max(200, 'Subject must not exceed 200 characters'),

	message: z
		.string()
		.trim()
		.min(10, 'Message must be at least 10 characters')
		.max(1000, 'Message must not exceed 1000 characters'),
});

/** Statuses an admin may move an inquiry to. */
export const INQUIRY_STATUSES = ['pending', 'reviewed', 'resolved'] as const;
