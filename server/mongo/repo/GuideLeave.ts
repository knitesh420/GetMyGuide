import mongoose from 'mongoose';
import IGuideLeave from '../types/guideLeave';

const GuideLeaveSchema = new mongoose.Schema<IGuideLeave>(
	{
		guide: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		type: {
			type: String,
			enum: ['vacation', 'emergency'],
			required: true,
		},
		startDate: {
			type: Date,
			required: true,
		},
		endDate: {
			type: Date,
			required: true,
		},
		reason: {
			type: String,
			trim: true,
			maxlength: 2000,
		},
		status: {
			type: String,
			enum: ['active', 'cancelled'],
			default: 'active',
		},
	},
	{
		timestamps: true,
	}
);

GuideLeaveSchema.index({ guide: 1, status: 1 });
GuideLeaveSchema.index({ guide: 1, startDate: 1, endDate: 1 });

const GuideLeaveDB = mongoose.model<IGuideLeave>('GuideLeave', GuideLeaveSchema);

export default GuideLeaveDB;
