import mongoose from 'mongoose';
import IWebhookEvent from '../types/webhookEvent';

const WebhookEventSchema = new mongoose.Schema<IWebhookEvent>(
	{
		eventId: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		eventType: {
			type: String,
			required: true,
			trim: true,
		},
		paymentId: {
			type: String,
			required: true,
			trim: true,
		},
		orderId: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			enum: ['processed', 'failed'],
			required: true,
		},
		processedAt: {
			type: Date,
			required: true,
			default: Date.now,
		},
	},
	{
		timestamps: true,
	}
);

// TTL index — auto-delete after 30 days
WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const WebhookEventDB = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

export default WebhookEventDB;
