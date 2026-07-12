import { Document, Types } from 'mongoose';

export type MessageSenderRole = 'tourist' | 'guide' | 'admin';

export default interface IMessage extends Document {
	_id: Types.ObjectId;
	/** Every thread is scoped to one booking — there is no free-form DM. */
	booking: Types.ObjectId;
	sender: Types.ObjectId;
	senderRole: MessageSenderRole;
	body: string;
	/** Accounts that have read this message. The sender is seeded in on create. */
	readBy: Types.ObjectId[];
	createdAt: Date;
	updatedAt: Date;
}
