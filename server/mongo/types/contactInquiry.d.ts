import { Document, Types } from 'mongoose';

export default interface IContactInquiry extends Document {
	_id: Types.ObjectId;
	fullName: string;
	phoneNumber: string;
	email: string;
	nationality: string;
	category: 'tour booking' | 'become a guide' | 'service' | 'other';
	serviceName?: string;
	subject: string;
	message: string;
	status: 'pending' | 'reviewed' | 'resolved';
	createdAt: Date;
	updatedAt: Date;
}
