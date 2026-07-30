import mongoose from 'mongoose';
import ILocation from '../types/location';

const LocationSchema = new mongoose.Schema<ILocation>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		// Public pages address a location by slug; uniqueness is what makes the
		// slug safe to use as a route key.
		slug: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
		},
		city: {
			type: String,
			required: true,
			trim: true,
		},
		state: {
			type: String,
			trim: true,
		},
		country: {
			type: String,
			trim: true,
			default: 'India',
		},
		description: {
			type: String,
			trim: true,
			maxlength: 5000,
		},
		image: {
			type: String,
			trim: true,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		isPopular: {
			type: Boolean,
			default: false,
		},
		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

LocationSchema.index({ isActive: 1, isPopular: -1 });
LocationSchema.index({ city: 1 });

const LocationDB = mongoose.model<ILocation>('Location', LocationSchema);

export default LocationDB;
