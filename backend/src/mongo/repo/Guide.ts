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
		// Mirrors GuideEnrollment.type; 'escort' is what `isCertified` keys off.
		// Deliberately has no default: Guide records written before this field
		// existed must hydrate as `undefined` so getGuideProfile can fall back to
		// the legacy enrollment's type. A default of 'normal' is applied on read
		// too, which would silently downgrade legacy escort guides.
		type: {
			type: String,
			enum: ['normal', 'escort'],
		},
		city: {
			type: String,
			default: '',
			trim: true,
		},
		// Collected for escort guides only; mirrors GuideEnrollment.pan.
		pan: {
			type: String,
			trim: true,
		},
		profileImage: {
			type: String,
			default: '',
		},
		// Licence and Aadhaar uploads land here, in that order.
		identityProofs: {
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
