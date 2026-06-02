import mongoose from 'mongoose';
import IPackage, { IPackageImage } from '../types/package';

const TranslationSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			trim: true,
		},
		city: {
			type: String,
			trim: true,
		},
		places: {
			type: [String],
			default: [],
		},
		shortDescription: {
			type: String,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		inclusions: {
			type: [String],
			default: [],
		},
		exclusions: {
			type: [String],
			default: [],
		},
	},
	{ _id: false }
);

const PackageImageSchema = new mongoose.Schema(
	{
		url: {
			type: String,
			required: true,
			trim: true,
		},
		publicId: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{ _id: false }
);

const PackageSchema = new mongoose.Schema<IPackage>(
	{
		price: {
			type: Number,
			min: 0,
		},
		baseCurrency: {
			type: String,
			trim: true,
			default: 'USD',
		},
		numberOfPeople: {
			type: Number,
			min: 1,
		},
		numberOfDays: {
			type: Number,
			min: 1,
		},
		featured: {
			type: Boolean,
			default: false,
		},
		status: {
			type: String,
			enum: ['inactive', 'active'],
			default: 'active',
		},
		images: {
			type: [PackageImageSchema],
			required: true,
			validate: {
				validator: (v: IPackageImage[]) => Array.isArray(v) && v.length > 0,
				message: 'At least one image is required',
			},
		},
		translations: {
			type: {
				en: { type: TranslationSchema, default: {} },
				es: { type: TranslationSchema, default: {} },
				fr: { type: TranslationSchema, default: {} },
				ru: { type: TranslationSchema, default: {} },
				de: { type: TranslationSchema, default: {} },
			},
			default: {
				en: {},
				es: {},
				fr: {},
				ru: {},
				de: {},
			},
		},
		// Backward-compatible legacy fields
		title: {
			type: String,
			trim: true,
		},
		city: {
			type: String,
			trim: true,
		},
		places: {
			type: [String],
			default: [],
		},
		shortDescription: {
			type: String,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		inclusions: {
			type: [String],
			default: [],
		},
		exclusions: {
			type: [String],
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

const PackageDB = mongoose.model<IPackage>('Package', PackageSchema);

export default PackageDB;
