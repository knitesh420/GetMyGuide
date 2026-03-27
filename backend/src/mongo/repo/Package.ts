import mongoose from 'mongoose';
import IPackage from '../types/package';

const PackageSchema = new mongoose.Schema<IPackage>(
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
		places: {
			type: [String],
			required: true,
			validate: {
				validator: (v: string[]) => Array.isArray(v) && v.length > 0,
				message: 'At least one place is required',
			},
		},
		images: {
			type: [String],
			required: true,
			validate: {
				validator: (v: string[]) => Array.isArray(v) && v.length > 0,
				message: 'At least one image is required',
			},
		},
		shortDescription: {
			type: String,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		price: {
			type: Number,
			min: 0,
		},
		inclusions: {
			type: [String],
		},
		exclusions: {
			type: [String],
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
	},
	{
		timestamps: true,
	}
);

const PackageDB = mongoose.model<IPackage>('Package', PackageSchema);

export default PackageDB;
