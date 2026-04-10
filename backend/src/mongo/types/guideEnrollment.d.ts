import { Document, Types } from 'mongoose';

export default interface IGuideEnrollment extends Document {
	_id: Types.ObjectId;
	name: string;
	email: string;
	phone: string;
	city: string;
	type: 'normal' | 'escort';
	pan?: string; // Optional - only for escort guides
	licence: string; // filename
	aadhar: string; // filename
	languages: string[];
	photo: string; // filename
	status: 'pending_payment' | 'completed' | 'failed';
	createdAt: Date;
	updatedAt: Date;
}
