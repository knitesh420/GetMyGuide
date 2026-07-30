import { Document, Types } from 'mongoose';

export type InvoiceType = 'booking' | 'guide_membership' | 'trip_completion';
export type InvoiceStatus = 'paid' | 'refunded' | 'cancelled';
export type InvoiceEmailStatus = 'pending' | 'sent' | 'failed';

export interface InvoiceCustomerSnapshot {
	name: string;
	email: string;
	phone: string;
	country: string;
	billingAddress?: string;
}

export interface InvoiceGuideSnapshot {
	name: string;
	email: string;
	phone: string;
	membershipPlan?: string;
	membershipDurationDays?: number;
}

export interface InvoiceBookingSnapshot {
	destination: string;
	travelDate?: Date;
	touristsCount?: number;
	assignedGuideName?: string;
}

export interface InvoicePaymentInfo {
	method?: string;
	amount: number;
	tax: number;
	discount: number;
	grandTotal: number;
	status: InvoiceStatus;
	currency: string;
}

export interface InvoiceCompanyInfo {
	name: string;
	supportEmail: string;
	supportPhone: string;
	website: string;
	address: string;
	logoUrl: string;
}

export default interface IInvoice extends Document {
	_id: Types.ObjectId;
	invoiceNumber: string;
	invoiceType: InvoiceType;
	invoiceDate: Date;
	paymentDate: Date;
	transaction: Types.ObjectId;
	razorpayPaymentId?: string;
	razorpayOrderId?: string;
	booking?: Types.ObjectId;
	trip?: Types.ObjectId;
	guideAccount?: Types.ObjectId;
	touristAccount?: Types.ObjectId;
	customerSnapshot: InvoiceCustomerSnapshot;
	guideSnapshot?: InvoiceGuideSnapshot;
	bookingSnapshot?: InvoiceBookingSnapshot;
	paymentInfo: InvoicePaymentInfo;
	companyInfo: InvoiceCompanyInfo;
	pdfUrl?: string;
	emailStatus: InvoiceEmailStatus;
	status: InvoiceStatus;
	createdBy?: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}
