import { Types } from 'mongoose';

/**
 * Input parsing for the package module.
 *
 * Extracted from package.validator.ts and package.controller.ts so the Express
 * middleware and the native Route Handlers share one definition. The rules are
 * transcribed unchanged, messages included — the admin panel renders those
 * strings verbatim.
 *
 * Unlike every other module here these are hand-rolled rather than zod, because
 * the originals are: `translations` arrives as a JSON *string* on multipart and
 * as an object on JSON, list fields accept three different encodings, and the
 * error messages are positional. Rewriting all that as zod during a migration
 * would be a behaviour change wearing a refactor's clothes.
 *
 * The parsers RETURN failures rather than throwing them. The Express validators
 * distinguished a validation failure (`next(new BadRequestError(msg))`) from an
 * unexpected throw (caught, and reported as the generic "Invalid package data"),
 * and a result type is what lets both callers keep that split without each
 * re-implementing it.
 */

export type ParseResult<T> = { ok: true; data: T } | { ok: false; message: string };

const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'ru'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Accepts a real array, a JSON array string, or a comma-separated string. */
function parseStringArray(input: any): string[] | null {
	if (Array.isArray(input)) {
		const arr = input.map((s) => String(s).trim()).filter(Boolean);
		return arr.length ? arr : null;
	}
	if (typeof input === 'string') {
		const trimmed = input.trim();
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				const arr = parsed.map((s) => String(s).trim()).filter(Boolean);
				return arr.length ? arr : null;
			}
		} catch {}
		if (trimmed.includes(',')) {
			const arr = trimmed
				.split(',')
				.map((p) => p.trim())
				.filter(Boolean);
			return arr.length ? arr : null;
		}
		if (trimmed.length) return [trimmed];
	}
	return null;
}

/**
 * Normalise the raw body into the shape the rules below expect.
 *
 * On multipart, `translations` is a JSON string; on JSON it is already an
 * object. A SHALLOW COPY is returned rather than mutating in place, which the
 * Express validator used to do — nothing downstream ever read the mutated
 * `req.body.translations`, and copying is what makes these parsers safe to call
 * from a Route Handler that has no request object to mutate.
 */
function normaliseBody(raw: unknown): { body: any } | { message: string } {
	const body = { ...((raw as any) || {}) };

	if (typeof body.translations === 'string') {
		try {
			body.translations = JSON.parse(body.translations);
		} catch {
			return { message: 'Invalid translations JSON' };
		}
	}

	return { body };
}

/** A complete translation for one locale, or the message saying what's missing. */
function parseTranslation(locale: Locale, body: any): any | string {
	const t = body?.translations?.[locale];

	if (!t || typeof t !== 'object') {
		return `translations.${locale} is required`;
	}

	const title = typeof t.title === 'string' ? t.title.trim() : '';
	const city = typeof t.city === 'string' ? t.city.trim() : '';
	const shortDescription = typeof t.shortDescription === 'string' ? t.shortDescription.trim() : '';
	const description = typeof t.description === 'string' ? t.description.trim() : '';
	const descriptionText = description.replace(/<[^>]*>/g, '').trim();

	if (!title) return `translations.${locale}.title is required`;
	if (!city) return `translations.${locale}.city is required`;
	if (!shortDescription) return `translations.${locale}.shortDescription is required`;
	if (!descriptionText) return `translations.${locale}.description is required`;

	const places = parseStringArray(t.places);
	if (!places) return `translations.${locale}.places is required and must be a non-empty array`;

	const inclusions = parseStringArray(t.inclusions);
	if (!inclusions)
		return `translations.${locale}.inclusions is required and must be a non-empty array`;

	const exclusions = parseStringArray(t.exclusions);
	if (!exclusions)
		return `translations.${locale}.exclusions is required and must be a non-empty array`;

	const highlights = parseStringArray(t.highlights);
	if (!highlights)
		return `translations.${locale}.highlights is required and must be a non-empty array`;

	return { title, city, shortDescription, description, places, inclusions, exclusions, highlights };
}

/** Create: price/group size/duration are mandatory, and so is the English text. */
export function parseCreatePackage(raw: unknown): ParseResult<Record<string, any>> {
	try {
		const normalised = normaliseBody(raw);
		if ('message' in normalised) return { ok: false, message: normalised.message };
		const body = normalised.body;

		// --- Numeric fields ---
		const price = Number(body.price);
		if (!Number.isFinite(price) || price < 0)
			return { ok: false, message: 'price is required and must be >= 0' };

		const numberOfPeople = Number(body.numberOfPeople);
		if (!Number.isFinite(numberOfPeople) || numberOfPeople < 1)
			return { ok: false, message: 'numberOfPeople is required and must be >= 1' };

		const numberOfDays = Number(body.numberOfDays);
		if (!Number.isFinite(numberOfDays) || numberOfDays < 1)
			return { ok: false, message: 'numberOfDays is required and must be >= 1' };

		// --- Translations ---
		const translations: Partial<Record<Locale, any>> = {};

		// Only English is required; the others are accepted when supplied and
		// silently skipped when incomplete.
		const english = parseTranslation('en', body);
		if (typeof english === 'string') return { ok: false, message: english };
		translations.en = english;

		for (const locale of SUPPORTED_LOCALES) {
			if (locale === 'en') continue;
			if (body.translations?.[locale]) {
				const result = parseTranslation(locale, body);
				if (typeof result !== 'string') {
					translations[locale] = result;
				}
			}
		}

		return {
			ok: true,
			data: {
				price,
				numberOfPeople,
				numberOfDays,
				translations,
				featured: body.featured === 'true' || body.featured === true,
			},
		};
	} catch {
		return { ok: false, message: 'Invalid package data' };
	}
}

/** Update: every field optional, and translations are patched per-locale. */
export function parseUpdatePackage(raw: unknown): ParseResult<Record<string, any>> {
	try {
		const normalised = normaliseBody(raw);
		if ('message' in normalised) return { ok: false, message: normalised.message };
		const body = normalised.body;

		const data: Record<string, any> = {};

		if (body.price !== undefined) {
			const price = Number(body.price);
			if (!Number.isFinite(price) || price < 0)
				return { ok: false, message: 'price must be >= 0' };
			data.price = price;
		}

		if (body.numberOfPeople !== undefined) {
			const numberOfPeople = Number(body.numberOfPeople);
			if (!Number.isFinite(numberOfPeople) || numberOfPeople < 1)
				return { ok: false, message: 'numberOfPeople must be >= 1' };
			data.numberOfPeople = numberOfPeople;
		}

		if (body.numberOfDays !== undefined) {
			const numberOfDays = Number(body.numberOfDays);
			if (!Number.isFinite(numberOfDays) || numberOfDays < 1)
				return { ok: false, message: 'numberOfDays must be >= 1' };
			data.numberOfDays = numberOfDays;
		}

		if (body.featured !== undefined) {
			data.featured = body.featured === 'true' || body.featured === true;
		}

		if (body.status !== undefined) {
			if (!['active', 'inactive'].includes(body.status))
				return { ok: false, message: 'status must be active or inactive' };
			data.status = body.status;
		}

		// Partial translation update — only the locales actually supplied are
		// validated, and dot notation keeps the others untouched.
		if (body.translations !== undefined) {
			for (const locale of SUPPORTED_LOCALES) {
				if (body.translations[locale] !== undefined) {
					const result = parseTranslation(locale, body);
					if (typeof result === 'string') return { ok: false, message: result };
					data[`translations.${locale}`] = result;
				}
			}
		}

		return { ok: true, data };
	} catch {
		return { ok: false, message: 'Invalid update data' };
	}
}

export function parseStatusUpdate(raw: unknown): ParseResult<{ status: string }> {
	const body = (raw as any) || {};
	const status = body.status;

	if (typeof status !== 'string') return { ok: false, message: 'status is required' };
	if (!['active', 'inactive'].includes(status))
		return { ok: false, message: 'status must be active or inactive' };

	return { ok: true, data: { status } };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * These routes take `:id` straight off the URL with no id-validator in front of
 * them, so a non-ObjectId segment used to reach Mongoose and surface as a
 * CastError — a 500 on what is really a client error.
 *
 * Returning null lets each handler answer 400 for a malformed id and keep 404
 * for a well-formed one that matches nothing — the same split the shared
 * IDValidator middleware produces everywhere else in this codebase.
 */
export function toPackageObjectId(input: string | string[] | undefined): Types.ObjectId | null {
	// Express 5 types a route param as `string | string[]`. A repeated param is
	// never a valid id, so reject the array form rather than coercing it.
	const raw = typeof input === 'string' ? input : undefined;
	if (!raw || !Types.ObjectId.isValid(raw)) return null;
	// isValid() accepts any 12-byte string as well as 24-hex, so round-trip it to
	// be sure the input really is the canonical id and not a coincidental match.
	const id = new Types.ObjectId(raw);
	return id.toString() === raw ? id : null;
}
