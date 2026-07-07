import mongoose from 'mongoose';
import IGuide from '../types/guide';

const GuideSchema = new mongoose.Schema<IGuide>(
	{
		accountId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
			unique: true,
		},
		languages: {
			type: [String],
			default: [],
		},
		experience: {
			type: String,
			default: '',
			trim: true,
		},
		city: {
			type: String,
			default: '',
			trim: true,
		},
		state: {
			type: String,
			default: '',
			trim: true,
		},
		country: {
			type: String,
			default: '',
			trim: true,
		},
		price: {
			type: Number,
			default: 0,
		},
		about: {
			type: String,
			default: '',
			trim: true,
		},
		specialization: {
			type: [String],
			default: [],
		},
		availableDays: {
			type: [String],
			default: [],
		},
		availableTime: {
			type: String,
			default: '',
			trim: true,
		},
		profileImage: {
			type: String,
			default: '',
		},
		identityProofs: {
			type: [String],
			default: [],
		},
		galleryImages: {
			type: [String],
			default: [],
		},
		registrationCompleted: {
			type: Boolean,
			default: false,
		},
		paymentStatus: {
			type: String,
			enum: ['pending', 'success', 'failed'],
			default: 'pending',
		},
		isVisible: {
			type: Boolean,
			default: false,
		},
		membershipStartDate: {
			type: Date,
			default: null,
		},
		membershipExpiryDate: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

// The exact filter the public guide listing runs on every request.
GuideSchema.index({ isVisible: 1, membershipExpiryDate: 1 });

const GuideDB = mongoose.model<IGuide>('Guide', GuideSchema);

export default GuideDB;
