import mongoose from 'mongoose';
import IMessage from '../types/message';

const MessageSchema = new mongoose.Schema<IMessage>(
	{
		booking: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Booking',
			required: true,
		},
		sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		senderRole: {
			type: String,
			enum: ['tourist', 'guide', 'admin'],
			required: true,
		},
		body: {
			type: String,
			required: true,
			trim: true,
			maxlength: 4000,
		},
		readBy: {
			type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }],
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

// The thread view reads one booking's messages oldest-first; the poll appends
// with a createdAt cursor. Both are served by this compound index.
MessageSchema.index({ booking: 1, createdAt: 1 });
// Drives the per-user unread badge without a collection scan.
MessageSchema.index({ booking: 1, readBy: 1 });

const MessageDB = mongoose.model<IMessage>('Message', MessageSchema);

export default MessageDB;
