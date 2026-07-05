import mongoose from 'mongoose';
import ITourist from '../types/tourist';

const TouristSchema = new mongoose.Schema<ITourist>(
	{
		accountId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
			unique: true,
		},
		nationality: {
			type: String,
			default: '',
			trim: true,
		},
		preferredLanguages: {
			type: [String],
			default: [],
		},
		travelInterests: {
			type: [String],
			default: [],
		},
		budget: {
			type: String,
			default: '',
			trim: true,
		},
		travelDates: {
			startDate: { type: Date, default: null },
			endDate: { type: Date, default: null },
		},
		numberOfTravelers: {
			type: Number,
			default: 1,
		},
		about: {
			type: String,
			default: '',
			trim: true,
		},
		// Present for schema parity with the spec's DB design — free
		// registration means this is never used to gate access.
		paymentStatus: {
			type: String,
			enum: ['pending', 'success', 'failed', 'na'],
			default: 'na',
		},
		registrationCompleted: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);

const TouristDB = mongoose.model<ITourist>('Tourist', TouristSchema);

export default TouristDB;
