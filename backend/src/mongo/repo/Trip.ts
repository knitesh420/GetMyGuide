import mongoose from 'mongoose';
import ITrip from '../types/trip';

const TripSchema = new mongoose.Schema<ITrip>(
	{
		booking: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Booking',
			required: true,
			unique: true,
		},
		assignment: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Assignment',
			required: true,
		},
		guide: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		status: {
			type: String,
			enum: ['not-started', 'in-progress', 'completed', 'cancelled'],
			default: 'not-started',
		},
		startedAt: {
			type: Date,
		},
		completedAt: {
			type: Date,
		},
		startNotes: {
			type: String,
			trim: true,
		},
		completionNotes: {
			type: String,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

TripSchema.index({ guide: 1, status: 1 });
TripSchema.index({ status: 1, createdAt: -1 });

const TripDB = mongoose.model<ITrip>('Trip', TripSchema);

export default TripDB;
