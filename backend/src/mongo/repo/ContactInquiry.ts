import { model, Schema } from 'mongoose';
import IContactInquiry from '../types/contactInquiry';

const contactInquirySchema = new Schema<IContactInquiry>(
	{
		fullName: {
			type: String,
			required: true,
			trim: true,
		},
		phoneNumber: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		nationality: {
			type: String,
			required: true,
			trim: true,
		},
		category: {
			type: String,
			required: true,
			enum: ['tour booking', 'become a guide', 'other'],
		},
		subject: {
			type: String,
			required: true,
			trim: true,
		},
		message: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			default: 'pending',
			enum: ['pending', 'reviewed', 'resolved'],
		},
	},
	{
		timestamps: true,
	}
);

// Create indexes
contactInquirySchema.index({ email: 1 });
contactInquirySchema.index({ category: 1 });
contactInquirySchema.index({ status: 1 });
contactInquirySchema.index({ createdAt: -1 });

const ContactInquiryDB = model<IContactInquiry>('ContactInquiry', contactInquirySchema);

export default ContactInquiryDB;
