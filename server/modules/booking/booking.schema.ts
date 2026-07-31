import { z } from 'zod';

/**
 * Zod schemas for the booking module.
 *
 * Extracted from booking.validator.ts so the Express middleware and the native
 * Route Handlers share one definition. Rules and messages are unchanged — a
 * second copy would drift, and a drifted validator surfaces as a rejected
 * request rather than a failing test.
 *
 * Almost every field here is wrapped in `z.preprocess`. That is not decoration:
 * the booking form has historically been posted as both JSON and multipart, and
 * under multipart every value arrives as a string — `"true"`, `"3"`,
 * `'["Red Fort"]'`. `z.coerce` cannot be substituted for these, because
 * `z.coerce.boolean()` reads the string `"false"` as `true`, which would turn
 * every unchecked box on the booking form into a checked one and silently
 * inflate the price the tourist is charged.
 */

/** `"true"`/`"false"` from a multipart field; anything else passes through. */
const toBoolean = (val: unknown) => {
	if (typeof val === 'string') {
		if (val === 'true') return true;
		if (val === 'false') return false;
		return val;
	}
	return val;
};

const toFloat = (val: unknown) => {
	if (typeof val === 'string') {
		const parsed = parseFloat(val);
		return isNaN(parsed) ? val : parsed;
	}
	return val;
};

const toInt = (val: unknown) => {
	if (typeof val === 'string') {
		const parsed = parseInt(val, 10);
		return isNaN(parsed) ? val : parsed;
	}
	return val;
};

/**
 * A list that may arrive as a JSON array, a JSON string, a comma-separated
 * string, or a single bare value. The empty string becomes `[]` rather than
 * `[""]` — note the `val ? … : []` guard, which is why this is not just a
 * `.split(',')`.
 */
const toStringArray = (val: unknown) => {
	if (typeof val === 'string') {
		try {
			return JSON.parse(val);
		} catch {
			return val ? val.split(',').map((s) => s.trim()) : [];
		}
	}
	return Array.isArray(val) ? val : val ? [val] : [];
};

const outstationSchema = z
	.object({
		distance: z.preprocess(toFloat, z.number().min(0, 'Distance must be a non-negative number')),
		over_night_stay: z.preprocess(
			toFloat,
			z.number().min(0, 'Overnight stay must be a non-negative number')
		),
		accomodation_meals: z.preprocess(toBoolean, z.boolean()),
		special_excursion: z.preprocess(toStringArray, z.array(z.string().trim())).optional(),
	})
	.optional();

export const createBookingSchema = z.object({
	tourist_info: z.object({
		name: z.string().trim().min(1, 'Name is required'),
		gender: z.enum(['male', 'female', 'other'], {
			message: 'Gender must be male, female, or other',
		}),
		phone: z.string().trim().min(1, 'Phone is required'),
		email: z.string().email('Invalid email address').trim().toLowerCase(),
		country: z.string().trim().min(1, 'Country is required'),
	}),
	travel_details: z.object({
		places: z
			.preprocess(
				// Deliberately NOT `toStringArray`: a bare string that fails JSON.parse
				// splits on commas without the empty-string guard, and a non-array
				// value is wrapped as `[val]` rather than dropped. The `.min(1)` below
				// is what rejects the empty case here.
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
				z.array(z.string().trim().min(1)).min(1, 'At least one place is required')
			)
			.transform((val) => (Array.isArray(val) ? val : [val])),
		city: z.string().trim().min(1, 'City is required'),
		date: z.preprocess(
			(val) => (typeof val === 'string' ? new Date(val) : val),
			z.date({ message: 'Invalid date format' })
		),
		no_of_person: z.preprocess(toInt, z.number().min(1, 'Number of persons must be at least 1')),
		preferences: z.object({
			hotel: z.preprocess(toBoolean, z.boolean()),
			taxi: z.preprocess(toBoolean, z.boolean()),
		}),
	}),
	guide_preferences: z.object({
		guide_language: z.preprocess(toStringArray, z.array(z.string().trim())).optional().default([]),
		gender: z.enum(['male', 'female', 'none'], {
			message: 'Gender preference must be male, female, or none',
		}),
	}),
	booking_configuration: z.object({
		duration: z.enum(['half-day', 'full-day'], {
			message: 'Duration must be half-day or full-day',
		}),
		foreign_language_required: z.preprocess(toBoolean, z.boolean()),
		outstation: outstationSchema,
		early_late_hours: z.preprocess(toBoolean, z.boolean()),
		extra_city_allowances: z.preprocess(toBoolean, z.boolean()),
		special_event_allowances: z
			.preprocess(toStringArray, z.array(z.string().trim()))
			.optional()
			.default([]),
		// The client-supplied price is not trusted as the amount charged — the
		// service re-derives it. This only rejects a payload that omits it.
		price: z.preprocess(toFloat, z.number().min(1, 'Price must be a positive number')),
	}),
});

export const packageBookingSchema = z.object({
	tourId: z.string().trim().min(1, 'Tour ID is required'),
	guideId: z.string().trim().min(1, 'Guide ID is required'),
	startDate: z.preprocess(
		(val) => (typeof val === 'string' ? new Date(val) : val),
		z.date({ message: 'Invalid start date' })
	),
	endDate: z.preprocess(
		(val) => (typeof val === 'string' ? new Date(val) : val),
		z.date({ message: 'Invalid end date' })
	),
	tourists: z.preprocess(toInt, z.number().min(1, 'At least one tourist is required')),
});

export const allocateGuideSchema = z.object({
	guide_id: z.string().trim().min(1, 'Guide ID is required'),
});
