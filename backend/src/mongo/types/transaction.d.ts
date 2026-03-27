import { Document, Types } from 'mongoose';

export default interface ITransaction extends Document {
	_id: Types.ObjectId;
	reference_id: string; // Generic reference ID (e.g., enrollment_id, booking_id, etc.)
	reference_type: string; // Type of reference (e.g., 'enrollment', 'booking', etc.)
	razorpay_order_id: string;
	razorpay_customer_id: string;
	transaction_id: string;
	status: string;
	amount: number;
	currency: string;
	createdAt: Date;
	updatedAt: Date;
}
