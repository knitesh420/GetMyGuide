import mongoose from 'mongoose';
import ITourist from '../types/tourist';
import { attachCodeOnUpsert } from '../utils/businessId';

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
		// Human-facing business ID, e.g. "TO000001". Sparse for backward compat.
		touristCode: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

// Tourist profiles are created via findOneAndUpdate({ upsert: true }), which
// does not fire document validate hooks — mint the code via $setOnInsert only
// when the profile does not yet exist.
TouristSchema.pre('findOneAndUpdate', async function () {
	await attachCodeOnUpsert(this, 'tourist', 'touristCode');
});

const TouristDB = mongoose.model<ITourist>('Tourist', TouristSchema);

export default TouristDB;
