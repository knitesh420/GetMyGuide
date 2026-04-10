import mongoose from 'mongoose';
import IIdempotencyKey from '../types/idempotencyKey';

const IdempotencyKeySchema = new mongoose.Schema<IIdempotencyKey>(
	{
		key: {
			type: String,
			required: true,
			trim: true,
		},
		endpoint: {
			type: String,
			required: true,
			trim: true,
		},
		requestHash: {
			type: String,
			required: true,
			trim: true,
		},
		response: {
			statusCode: {
				type: Number,
				required: true,
			},
			body: {
				type: mongoose.Schema.Types.Mixed,
				required: true,
			},
		},
	},
	{
		timestamps: true,
	}
);

// Compound index for fast lookups
IdempotencyKeySchema.index({ key: 1, endpoint: 1 }, { unique: true });

// TTL index — auto-delete after 24 hours
IdempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const IdempotencyKeyDB = mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);

export default IdempotencyKeyDB;
