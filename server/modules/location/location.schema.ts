import { z } from 'zod';

/**
 * Zod schemas for the location module.
 *
 * Extracted from location.validator.ts so the Express middleware and the native
 * Route Handlers share one definition. Rules and messages are unchanged — a
 * second copy would drift, and a drifted validator surfaces as a rejected
 * request rather than a failing test.
 */

/**
 * The admin panel posts multipart, so every field arrives as a string — "false"
 * included, which `z.coerce.boolean()` would read as true. Parse the flag by
 * hand instead of coercing.
 */
const multipartBoolean = z
	.union([z.boolean(), z.string()])
	.transform((value) => (typeof value === 'boolean' ? value : value.toLowerCase() === 'true'));

export const locationCreateSchema = z.object({
	name: z.string().trim().min(2, 'Name is required').max(200),
	city: z.string().trim().min(2, 'City is required').max(120),
	state: z.string().trim().max(120).optional(),
	country: z.string().trim().max(120).default('India'),
	description: z.string().trim().max(5000).optional(),
	// The image arrives as an uploaded file, not a field; the handler pushes it
	// to Cloudinary and sets the URL. A caller may still pass one directly.
	image: z.string().trim().url('Image must be a URL').optional(),
	isActive: multipartBoolean.default(true),
	isPopular: multipartBoolean.default(false),
});

export const locationUpdateSchema = z.object({
	name: z.string().trim().min(2).max(200).optional(),
	city: z.string().trim().min(2).max(120).optional(),
	state: z.string().trim().max(120).optional(),
	country: z.string().trim().max(120).optional(),
	description: z.string().trim().max(5000).optional(),
	image: z.string().trim().url('Image must be a URL').optional(),
	isActive: multipartBoolean.optional(),
	isPopular: multipartBoolean.optional(),
});

/**
 * `popular` uses `z.coerce.boolean()`, which reads the string "false" as true.
 * That is wrong in the abstract but it is the behaviour the public listing has
 * always had, and the only caller sends `popular=true` or omits it — so this is
 * transcribed as-is rather than quietly corrected. See the create/update flags
 * above for how a *body* boolean is handled.
 */
export const locationListQuerySchema = z.object({
	city: z.string().trim().optional(),
	popular: z.coerce.boolean().optional(),
	search: z.string().trim().optional(),
});
