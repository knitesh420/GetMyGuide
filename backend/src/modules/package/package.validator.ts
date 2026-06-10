import { BadRequestError } from 'node-be-utilities';
import { NextFunction, Request, Response } from 'express';

const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'ru'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

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

function parseTranslationsBody(body: any): string | null {
	if (typeof body.translations !== 'string') return null;

	try {
		body.translations = JSON.parse(body.translations);
		return null;
	} catch {
		return 'Invalid translations JSON';
	}
}

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

export async function CreatePackageValidator(req: Request, _res: Response, next: NextFunction) {
	try {
		const body = req.body || {};
		const translationsError = parseTranslationsBody(body);
		if (translationsError) return next(new BadRequestError(translationsError));

		// --- Numeric fields ---
		const price = Number(body.price);
		if (!Number.isFinite(price) || price < 0)
			return next(new BadRequestError('price is required and must be >= 0'));

		const numberOfPeople = Number(body.numberOfPeople);
		if (!Number.isFinite(numberOfPeople) || numberOfPeople < 1)
			return next(new BadRequestError('numberOfPeople is required and must be >= 1'));

		const numberOfDays = Number(body.numberOfDays);
		if (!Number.isFinite(numberOfDays) || numberOfDays < 1)
			return next(new BadRequestError('numberOfDays is required and must be >= 1'));

		// --- Translations ---
		const translations: Partial<Record<Locale, any>> = {};

		// Only require English, accept optional translations for other languages
		const result = parseTranslation('en', body);
		if (typeof result === 'string') return next(new BadRequestError(result));
		translations.en = result;

		// Parse optional translations for other locales
		for (const locale of SUPPORTED_LOCALES) {
			if (locale === 'en') continue; // Already processed
			if (body.translations?.[locale]) {
				const result = parseTranslation(locale, body);
				if (typeof result !== 'string') {
					translations[locale] = result;
				}
			}
		}

		const data: any = {
			price,
			numberOfPeople,
			numberOfDays,
			translations,
			featured: body.featured === 'true' || body.featured === true,
		};

		req.locals = req.locals || {};
		req.locals.data = data;
		return next();
	} catch (err) {
		return next(new BadRequestError('Invalid package data'));
	}
}

export async function UpdatePackageValidator(req: Request, _res: Response, next: NextFunction) {
	try {
		const body = req.body || {};
		const translationsError = parseTranslationsBody(body);
		if (translationsError) return next(new BadRequestError(translationsError));
		const data: any = {};

		if (body.price !== undefined) {
			const price = Number(body.price);
			if (!Number.isFinite(price) || price < 0)
				return next(new BadRequestError('price must be >= 0'));
			data.price = price;
		}

		if (body.numberOfPeople !== undefined) {
			const numberOfPeople = Number(body.numberOfPeople);
			if (!Number.isFinite(numberOfPeople) || numberOfPeople < 1)
				return next(new BadRequestError('numberOfPeople must be >= 1'));
			data.numberOfPeople = numberOfPeople;
		}

		if (body.numberOfDays !== undefined) {
			const numberOfDays = Number(body.numberOfDays);
			if (!Number.isFinite(numberOfDays) || numberOfDays < 1)
				return next(new BadRequestError('numberOfDays must be >= 1'));
			data.numberOfDays = numberOfDays;
		}

		if (body.featured !== undefined) {
			data.featured = body.featured === 'true' || body.featured === true;
		}

		if (body.status !== undefined) {
			if (!['active', 'inactive'].includes(body.status))
				return next(new BadRequestError('status must be active or inactive'));
			data.status = body.status;
		}

		// Partial translation update — only validate locales that are provided
		if (body.translations !== undefined) {
			const translations: Partial<Record<Locale, any>> = {};

			for (const locale of SUPPORTED_LOCALES) {
				if (body.translations[locale] !== undefined) {
					const result = parseTranslation(locale, body);
					if (typeof result === 'string') return next(new BadRequestError(result));
					translations[locale] = result;
				}
			}

			// Use dot notation to update only provided locales
			for (const [locale, value] of Object.entries(translations)) {
				data[`translations.${locale}`] = value;
			}
		}

		req.locals = req.locals || {};
		req.locals.data = data;
		return next();
	} catch (err) {
		return next(new BadRequestError('Invalid update data'));
	}
}

export async function UpdateStatusValidator(req: Request, _res: Response, next: NextFunction) {
	const body = req.body || {};
	const status = body.status;
	if (typeof status !== 'string') return next(new BadRequestError('status is required'));
	const allowed = ['active', 'inactive'];
	if (!allowed.includes(status))
		return next(new BadRequestError('status must be active or inactive'));
	req.locals = req.locals || {};
	req.locals.data = { status };
	return next();
}

export default {} as any;
