import { Document, Types } from 'mongoose';

export type LanguageCode = 'en' | 'es' | 'fr' | 'ru' | 'de';

export interface TranslationFields {
	title?: string;
	city?: string;
	places?: string[];
	shortDescription?: string;
	description?: string;
	inclusions?: string[];
	exclusions?: string[];
	highlights?: string[];
}

export interface IPackageTranslations {
	en: TranslationFields;
	es?: TranslationFields;
	fr?: TranslationFields;
	ru?: TranslationFields;
	de?: TranslationFields;
}

export interface IPackageImage {
	url: string;
	publicId: string;
}

export default interface IPackage extends Document {
	_id: Types.ObjectId;
	price?: number;
	baseCurrency?: string;
	numberOfPeople?: number;
	numberOfDays?: number;
	featured?: boolean;
	status?: 'inactive' | 'active';
	images: IPackageImage[];
	translations?: IPackageTranslations;

	// Backward-compatible fields for legacy packages
	title?: string;
	city?: string;
	places?: string[];
	shortDescription?: string;
	description?: string;
	inclusions?: string[];
	exclusions?: string[];

	deletedAt?: Date | null;

	createdAt: Date;
	updatedAt: Date;
}
