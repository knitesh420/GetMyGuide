import mongoose from 'mongoose';
import IPendingRegistration, { PendingGuideDraft } from '../types/pendingRegistration';

const PendingGuideDraftSchema = new mongoose.Schema<PendingGuideDraft>(
	{
		city: { type: String, required: true, trim: true },
		type: { type: String, enum: ['normal', 'escort'], required: true },
		languages: { type: [String], required: true },
		pan: { type: String, trim: true },
		profileImage: { type: String, required: true, trim: true },
		identityProofs: { type: [String], required: true },
	},
	{ _id: false }
);

const PendingRegistrationSchema = new mongoose.Schema<IPendingRegistration>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
		},
		countryCode: {
			type: String,
			required: true,
			trim: true,
		},
		passwordHash: {
			type: String,
			required: true,
			select: false,
		},
		accountType: {
			type: String,
			enum: ['tourist', 'guide'],
			required: true,
		},
		guideDraft: {
			type: PendingGuideDraftSchema,
			default: undefined,
		},
		otpHash: {
			type: String,
			required: true,
			select: false,
		},
		status: {
			type: String,
			enum: ['pending', 'finalizing'],
			default: 'pending',
			required: true,
		},
		otpExpiresAt: {
			type: Date,
			required: true,
		},
		attempts: {
			type: Number,
			default: 0,
		},
		lastSentAt: {
			type: Date,
			default: Date.now,
		},
		expireAt: {
			type: Date,
			required: true,
			index: { expires: 0 },
		},
	},
	{
		timestamps: true,
	}
);

const PendingRegistrationDB = mongoose.model<IPendingRegistration>(
	'PendingRegistration',
	PendingRegistrationSchema
);

export default PendingRegistrationDB;
