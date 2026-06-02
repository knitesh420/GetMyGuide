import { NextFunction, Request, Response } from 'express';
import { IPackageImage } from '@mongo/types/package';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type LanguageCode = 'en' | 'es' | 'fr' | 'ru' | 'de';

type NormalizeRequestDataResult =
	| { success: true; data: unknown }
	| { success: false; error: z.ZodError<any> };

type ParsedPackageData = {
	translations?: unknown;
	price?: number;
	baseCurrency?: string;
	numberOfPeople?: number;
	numberOfDays?: number;
	featured?: boolean;
	status?: 'inactive' | 'active';
};

const supportedLanguages: LanguageCode[] = ['en', 'es', 'fr', 'ru', 'de'];

export interface TranslationFields {
	title?: string;
	city?: string;
	places?: string[];
	shortDescription?: string;
	description?: string;
	inclusions?: string[];
	exclusions?: string[];
}

export type CreatePackageValidationResult = {
	price?: number;
	baseCurrency: string;
	numberOfPeople?: number;
	numberOfDays?: number;
	featured?: boolean;
	status?: 'inactive' | 'active';
	images?: IPackageImage[];
	translations: Record<LanguageCode, TranslationFields>;
};

export type UpdatePackageValidationResult = {
	price?: number;
	baseCurrency?: string;
	numberOfPeople?: number;
	numberOfDays?: number;
	featured?: boolean;
	status?: 'inactive' | 'active';
	images?: IPackageImage[];
	translations?: Partial<Record<LanguageCode, TranslationFields>>;
};

const stringArrayPreprocess = (val: unknown) => {
	if (val === undefined || val === null || val === '') return undefined;
	if (typeof val === 'string') {
		try {
			const parsed = JSON.parse(val);
			return Array.isArray(parsed) ? parsed : [parsed];
		} catch {
			return val.split(',').map((s) => s.trim());
		}
	}
	return Array.isArray(val) ? val : [val];
};

const booleanPreprocess = (val: unknown) => {
	if (val === undefined || val === null || val === '') return undefined;
	if (typeof val === 'boolean') return val;
	if (typeof val === 'string') {
		if (val === 'true') return true;
		if (val === 'false') return false;
	}
	return val;
};

const parseJson = (val: unknown) => {
	if (typeof val !== 'string') return val;
	try {
		return JSON.parse(val);
	} catch {
		return val;
	}
};

const translationSchema = z.object({
	title: z.string().trim().min(1).optional(),
	city: z.string().trim().min(1).optional(),
	places: z.preprocess(
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
		z.array(z.string().trim().min(1)).optional()
	),
	shortDescription: z.string().trim().optional(),
	description: z.string().trim().optional(),
	inclusions: z.preprocess(stringArrayPreprocess, z.array(z.string().trim().min(1)).optional()),
	exclusions: z.preprocess(stringArrayPreprocess, z.array(z.string().trim().min(1)).optional()),
});

const translationsSchema = z.preprocess(
	parseJson,
	z
		.object({
			en: translationSchema.optional(),
			es: translationSchema.optional(),
			fr: translationSchema.optional(),
			ru: translationSchema.optional(),
			de: translationSchema.optional(),
		})
		.partial()
);

const commonPackageFields = {
	price: z.preprocess(
		(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
		z.number().min(0, 'Price must be a positive number').optional()
	),
	baseCurrency: z.string().trim().default('USD'),
	numberOfPeople: z.preprocess(
		(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
		z.number().int().min(1, 'Number of people must be at least 1').optional()
	),
	numberOfDays: z.preprocess(
		(val) => (val !== undefined && val !== '' ? Number(val) : undefined),
		z.number().int().min(1, 'Number of days must be at least 1').optional()
	),
	featured: z.preprocess(booleanPreprocess, z.boolean().optional()),
	status: z
		.enum(['inactive', 'active'], {
			message: 'Status must be either inactive or active',
		})
		.optional(),
};

const createTextFields = {
	title: z.string().trim().min(1, 'Title is required').optional(),
	city: z.string().trim().min(1, 'City is required').optional(),
	places: z.preprocess(
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
		z.array(z.string().trim().min(1)).optional()
	),
};

const createPackageValidator = z.object({
	...createTextFields,
	...commonPackageFields,
	translations: translationsSchema.optional(),
});

const updatePackageValidator = z.object({
	...commonPackageFields,
	translations: translationsSchema.optional(),
});

function normalizeTranslation(value: unknown): TranslationFields {
	const safe = translationSchema.safeParse(value);
	if (!safe.success) {
		return {};
	}
	return {
		...(safe.data.title ? { title: safe.data.title } : {}),
		...(safe.data.city ? { city: safe.data.city } : {}),
		...(safe.data.places ? { places: safe.data.places } : {}),
		...(safe.data.shortDescription ? { shortDescription: safe.data.shortDescription } : {}),
		...(safe.data.description ? { description: safe.data.description } : {}),
		...(safe.data.inclusions ? { inclusions: safe.data.inclusions } : {}),
		...(safe.data.exclusions ? { exclusions: safe.data.exclusions } : {}),
	};
}

function buildLegacyTranslation(data: any): TranslationFields {
	return {
		title: data.title,
		city: data.city,
		places: data.places,
		shortDescription: data.shortDescription,
		description: data.description,
		inclusions: data.inclusions,
		exclusions: data.exclusions,
	};
}

function normalizeTranslations(
	data: unknown,
	topLevel: any = {}
): Record<LanguageCode, TranslationFields> {
	const rawTranslations =
		typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
	const translations: Record<LanguageCode, TranslationFields> = {
		en: {},
		es: {},
		fr: {},
		ru: {},
		de: {},
	};

	supportedLanguages.forEach((language) => {
		translations[language] = normalizeTranslation(rawTranslations[language] ?? {});
	});

	if (!translations.en.title || !translations.en.city || !translations.en.places?.length) {
		const legacy = buildLegacyTranslation(topLevel);
		translations.en = {
			...legacy,
			...translations.en,
		};
	}

	return translations;
}

function normalizeRequestData(result: NormalizeRequestDataResult, requireEnglish = false) {
	if (!result.success) {
		const message = result.error.issues
			.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
			.join(', ');
		throw new BadRequestError(message);
	}

	const data = result.data as ParsedPackageData;
	const translations = normalizeTranslations(data.translations, data);

	if (requireEnglish) {
		if (!translations.en.title || !translations.en.city || !translations.en.places?.length) {
			throw new BadRequestError('English translation for title, city and places is required');
		}
	}

	return {
		price: data.price,
		baseCurrency: data.baseCurrency ?? 'USD',
		numberOfPeople: data.numberOfPeople,
		numberOfDays: data.numberOfDays,
		featured: data.featured,
		status: data.status,
		translations,
	};
}

export async function CreatePackageValidator(req: Request, res: Response, next: NextFunction) {
	try {
		const parsed = createPackageValidator.parse(req.body);
		req.locals.data = normalizeRequestData({ success: true, data: parsed }, true);
		return next();
	} catch (error: any) {
		return next(new BadRequestError(error.message || 'Invalid package data'));
	}
}

export async function UpdatePackageValidator(req: Request, res: Response, next: NextFunction) {
	try {
		const parsed = updatePackageValidator.parse(req.body);
		req.locals.data = normalizeRequestData({ success: true, data: parsed }, false);
		return next();
	} catch (error: any) {
		return next(new BadRequestError(error.message || 'Invalid package data'));
	}
}

export type UpdateStatusValidationResult = {
	status: 'inactive' | 'active';
};

export async function UpdateStatusValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		status: z.enum(['inactive', 'active'], {
			message: 'Status must be either inactive or active',
		}),
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
