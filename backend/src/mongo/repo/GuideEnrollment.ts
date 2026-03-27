import mongoose from 'mongoose';
import IGuideEnrollment from '../types/guideEnrollment';

const GuideEnrollmentSchema = new mongoose.Schema<IGuideEnrollment>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			lowercase: true,
			trim: true,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
		},
		city: {
			type: String,
			required: true,
			trim: true,
		},
		type: {
			type: String,
			enum: ['normal', 'escort'],
			required: true,
		},
		pan: {
			type: String,
			required: false, // Optional - only required for escort guides
			trim: true,
		},
		licence: {
			type: String,
			required: true,
			trim: true,
		},
		aadhar: {
			type: String,
			required: true,
			trim: true,
		},
		languages: {
			type: [String],
			required: true,
			default: [],
		},
		photo: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

const GuideEnrollmentDB = mongoose.model<IGuideEnrollment>(
	'GuideEnrollment',
	GuideEnrollmentSchema
);

export default GuideEnrollmentDB;
