import mongoose from 'mongoose';
import IReview from '../types/review';

const ReviewSchema = new mongoose.Schema<IReview>(
	{
		booking: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Booking',
			required: true,
			unique: true,
		},
		guide: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		tourist: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		comment: {
			type: String,
			trim: true,
			maxlength: 1000,
		},
		isHidden: {
			type: Boolean,
			default: false,
		},
		moderatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
		},
		moderatedAt: {
			type: Date,
		},
	},
	{
		timestamps: true,
	}
);

ReviewSchema.index({ guide: 1, isHidden: 1, createdAt: -1 });
ReviewSchema.index({ tourist: 1 });

const ReviewDB = mongoose.model<IReview>('Review', ReviewSchema);

export default ReviewDB;
