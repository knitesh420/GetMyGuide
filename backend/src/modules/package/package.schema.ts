// package.schema.ts

import mongoose, { Schema } from 'mongoose';

const TranslationSchema = new Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
		},

		city: {
			type: String,
			required: true,
			trim: true,
		},

		places: [
			{
				type: String,
				trim: true,
			},
		],

		shortDescription: {
			type: String,
			required: true,
			trim: true,
		},

		description: {
			type: String,
			required: true,
		},

		inclusions: [
			{
				type: String,
				trim: true,
			},
		],

		exclusions: [
			{
				type: String,
				trim: true,
			},
		],

		highlights: [
			{
				type: String,
				trim: true,
			},
		],
	},
	{ _id: false }
);

const PackageSchema = new Schema(
	{
		images: [
			{
				url: {
					type: String,
					required: true,
				},

				publicId: {
					type: String,
					required: true,
				},
			},
		],

		price: {
			type: Number,
			required: true,
			min: 0,
		},

		numberOfPeople: {
			type: Number,
			required: true,
			min: 1,
		},

		numberOfDays: {
			type: Number,
			required: true,
			min: 1,
		},

		featured: {
			type: Boolean,
			default: false,
		},

		status: {
			type: String,
			enum: ['active', 'inactive'],
			default: 'active',
		},

		translations: {
			en: TranslationSchema,
			fr: TranslationSchema,
			de: TranslationSchema,
			es: TranslationSchema,
			ru: TranslationSchema,
		},
	},
	{
		timestamps: true,
	}
);

const PackageModel =
	(mongoose.models && mongoose.models.Package) || mongoose.model('Package', PackageSchema);

export default PackageModel;
