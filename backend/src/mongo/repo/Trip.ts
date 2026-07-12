import mongoose from 'mongoose';
import ITrip from '../types/trip';
import { nextCode } from '../utils/businessId';

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
			maxlength: 2000,
		},
		completionNotes: {
			type: String,
			trim: true,
			maxlength: 2000,
		},
		// Human-facing business ID, e.g. "TR000001". Sparse for backward compat.
		tripCode: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
		},
		// Append-only lifecycle timeline, populated by services on status change.
		statusHistory: {
			type: [
				{
					status: { type: String },
					at: { type: Date, default: Date.now },
					by: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
					note: { type: String, trim: true, maxlength: 2000 },
					_id: false,
				},
			],
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

TripSchema.index({ guide: 1, status: 1 });
TripSchema.index({ status: 1, createdAt: -1 });

// Trip is created via .create(), so the document validate hook fires.
TripSchema.pre('validate', async function () {
	if (this.isNew && !this.tripCode) {
		this.tripCode = await nextCode('trip');
	}
});

// Auto-append the lifecycle timeline whenever status changes via a document
// save (create, start, complete, cancel). findOneAndUpdate paths bypass this
// hook and push their own entry.
TripSchema.pre('save', function () {
	if (this.isNew) {
		this.statusHistory = [{ status: this.status, at: new Date() }];
	} else if (this.isModified('status')) {
		this.statusHistory = [...(this.statusHistory ?? []), { status: this.status, at: new Date() }];
	}
});

const TripDB = mongoose.model<ITrip>('Trip', TripSchema);

export default TripDB;
