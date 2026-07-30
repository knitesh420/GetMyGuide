import { Document, Types } from 'mongoose';

export default interface IWebhookEvent extends Document {
	_id: Types.ObjectId;
	eventId: string;
	eventType: string;
	paymentId: string;
	orderId: string;
	status: 'processed' | 'failed';
	processedAt: Date;
	createdAt: Date;
	updatedAt: Date;
}
