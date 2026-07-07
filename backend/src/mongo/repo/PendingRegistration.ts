import mongoose from 'mongoose';
import IPendingRegistration from '../types/pendingRegistration';

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
		otpHash: {
			type: String,
			required: true,
			select: false,
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
