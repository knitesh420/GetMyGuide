import {
	COMPANY_ADDRESS,
	COMPANY_LOGO_URL,
	COMPANY_NAME,
	COMPANY_SUPPORT_EMAIL,
	COMPANY_SUPPORT_PHONE,
	COMPANY_WEBSITE,
} from '@config/company';
import { GUIDE_MEMBERSHIP_DURATION_DAYS } from '@config/const';
import { AccountDB, BookingDB, CounterDB, InvoiceDB, TransactionDB } from '@mongo';
import IBooking from '@mongo/types/booking';
import IGuide from '@mongo/types/guide';
import IInvoice, {
	InvoiceBookingSnapshot,
	InvoiceCompanyInfo,
	InvoiceCustomerSnapshot,
	InvoiceGuideSnapshot,
	InvoiceStatus,
	InvoiceType,
} from '@mongo/types/invoice';
import ITransaction from '@mongo/types/transaction';
import ITrip from '@mongo/types/trip';
import { sendInvoiceEmail } from '@provider/email';
import RazorpayProvider from '@provider/razorpay';
import { JWTPayload } from '@services/jwt';
import uploadToCloudinary from '@utils/cloudinaryUpload';
import { Types } from 'mongoose';
import { ForbiddenError, NotFoundError, error as logError } from 'node-be-utilities';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import ExcelJS from 'exceljs';
import ActivityLogService from './activityLog';
import TransactionService from './transaction';

interface PageParams {
	page?: number;
	limit?: number;
}

interface ListFilters {
	invoiceType?: InvoiceType;
	status?: InvoiceStatus;
	search?: string;
	from?: string;
	to?: string;
}

interface GenerateInvoiceInput {
	invoiceType: InvoiceType;
	transaction: ITransaction;
	paymentDate: Date;
	booking?: IBooking;
	trip?: ITrip;
	guideAccountId?: string;
	touristAccountId?: string;
	customerSnapshot: InvoiceCustomerSnapshot;
	guideSnapshot?: InvoiceGuideSnapshot;
	bookingSnapshot?: InvoiceBookingSnapshot;
	createdBy?: string;
}

const TYPE_LABELS: Record<InvoiceType, string> = {
	booking: 'Tourist Booking',
	guide_membership: 'Guide Membership',
	trip_completion: 'Trip Completion',
};

class InvoiceService {
	/**
	 * Tourist Booking Invoice — called from BookingService.verifyAndCreateBooking
	 * right after the booking is created.
	 */
	async createBookingInvoice(transaction: ITransaction, booking: IBooking) {
		return this.generateInvoice({
			invoiceType: 'booking',
			transaction,
			paymentDate: new Date(),
			booking,
			touristAccountId: booking.linked_to ? booking.linked_to.toString() : undefined,
			customerSnapshot: {
				name: booking.tourist_info.name,
				email: booking.tourist_info.email,
				phone: booking.tourist_info.phone,
				country: booking.tourist_info.country,
			},
			bookingSnapshot: {
				destination: booking.travel_details.city,
				travelDate: booking.travel_details.date,
				touristsCount: booking.travel_details.no_of_person,
			},
		});
	}

	/**
	 * Guide Membership Invoice — called from GuideService
	 * .finalizeMembershipPaymentByGuideId, which is the single point both the
	 * synchronous confirm-payment call and the Razorpay webhook converge on.
	 */
	async createMembershipInvoice(guide: IGuide) {
		const account = await AccountDB.findById(guide.accountId);
		if (!account) {
			logError('InvoiceService: guide account not found for membership invoice', {
				guideId: guide._id.toString(),
			});
			return null;
		}

		const transaction = await TransactionService.getTransactionByReference(
			guide._id.toString(),
			'guide_membership'
		);
		if (!transaction) {
			logError('InvoiceService: no transaction found for membership invoice', {
				guideId: guide._id.toString(),
			});
			return null;
		}

		return this.generateInvoice({
			invoiceType: 'guide_membership',
			transaction,
			paymentDate: new Date(),
			guideAccountId: account._id.toString(),
			customerSnapshot: {
				name: account.name,
				email: account.email,
				phone: account.phone,
				// Guides no longer record a country; the PDF omits the line when blank.
				country: '',
			},
			guideSnapshot: {
				name: account.name,
				email: account.email,
				phone: account.phone,
				membershipPlan: `${GUIDE_MEMBERSHIP_DURATION_DAYS}-day membership`,
				membershipDurationDays: GUIDE_MEMBERSHIP_DURATION_DAYS,
			},
		});
	}

	/**
	 * Trip Completion Invoice — called from TripService.complete(). This app
	 * charges the full booking amount upfront, so this isn't a new charge —
	 * it's a completion receipt re-stating the original booking payment
	 * against the now-completed trip.
	 */
	async createTripCompletionInvoice(trip: ITrip) {
		const booking = await BookingDB.findById(trip.booking);
		if (!booking) {
			logError('InvoiceService: booking not found for trip completion invoice', {
				tripId: trip._id.toString(),
			});
			return null;
		}

		const transaction = await TransactionDB.findOne({ transaction_id: booking.transaction_id });
		if (!transaction) {
			logError('InvoiceService: no transaction found for trip completion invoice', {
				tripId: trip._id.toString(),
			});
			return null;
		}

		const guideAccount = await AccountDB.findById(trip.guide);

		return this.generateInvoice({
			invoiceType: 'trip_completion',
			transaction,
			paymentDate: transaction.updatedAt,
			booking,
			trip,
			touristAccountId: booking.linked_to ? booking.linked_to.toString() : undefined,
			guideAccountId: trip.guide.toString(),
			customerSnapshot: {
				name: booking.tourist_info.name,
				email: booking.tourist_info.email,
				phone: booking.tourist_info.phone,
				country: booking.tourist_info.country,
			},
			guideSnapshot: guideAccount
				? {
						name: guideAccount.name,
						email: guideAccount.email,
						phone: guideAccount.phone,
					}
				: undefined,
			bookingSnapshot: {
				destination: booking.travel_details.city,
				travelDate: booking.travel_details.date,
				touristsCount: booking.travel_details.no_of_person,
				assignedGuideName: guideAccount?.name,
			},
		});
	}

	private async nextInvoiceNumber(): Promise<string> {
		const year = new Date().getFullYear();
		const counter = await CounterDB.findOneAndUpdate(
			{ _id: `invoice-${year}` },
			{ $inc: { seq: 1 } },
			{ upsert: true, new: true }
		);
		return `INV-${year}-${counter.seq.toString().padStart(6, '0')}`;
	}

	private buildCompanyInfo(): InvoiceCompanyInfo {
		return {
			name: COMPANY_NAME,
			supportEmail: COMPANY_SUPPORT_EMAIL,
			supportPhone: COMPANY_SUPPORT_PHONE,
			website: COMPANY_WEBSITE,
			address: COMPANY_ADDRESS,
			logoUrl: COMPANY_LOGO_URL,
		};
	}

	private async fetchPaymentMethod(razorpayPaymentId?: string): Promise<string | undefined> {
		if (!razorpayPaymentId) return undefined;
		try {
			const payment = await RazorpayProvider.payments.getPayment(razorpayPaymentId);
			return payment.method;
		} catch {
			// Payment method is a cosmetic detail on the invoice — never let a
			// lookup failure block invoice generation.
			return undefined;
		}
	}

	/**
	 * Shared core of all three invoice types: allocates the number, persists
	 * the row (idempotent on {invoiceType, transaction}), then generates the
	 * PDF and sends the email as a best-effort follow-up that can never make
	 * the base Invoice record disappear.
	 */
	private async generateInvoice(input: GenerateInvoiceInput): Promise<IInvoice | null> {
		const paymentMethod = await this.fetchPaymentMethod(input.transaction.razorpay_payment_id);
		const invoiceNumber = await this.nextInvoiceNumber();

		let invoice: IInvoice;
		try {
			invoice = await InvoiceDB.create({
				invoiceNumber,
				invoiceType: input.invoiceType,
				invoiceDate: new Date(),
				paymentDate: input.paymentDate,
				transaction: input.transaction._id,
				razorpayPaymentId: input.transaction.razorpay_payment_id,
				razorpayOrderId: input.transaction.razorpay_order_id,
				booking: input.booking?._id,
				trip: input.trip?._id,
				guideAccount: input.guideAccountId,
				touristAccount: input.touristAccountId,
				customerSnapshot: input.customerSnapshot,
				guideSnapshot: input.guideSnapshot,
				bookingSnapshot: input.bookingSnapshot,
				paymentInfo: {
					method: paymentMethod,
					amount: input.transaction.amount,
					tax: 0,
					discount: 0,
					grandTotal: input.transaction.amount,
					status: 'paid',
					currency: input.transaction.currency,
				},
				companyInfo: this.buildCompanyInfo(),
				emailStatus: 'pending',
				status: 'paid',
				createdBy: input.createdBy,
			});
		} catch (err: unknown) {
			// Duplicate {invoiceType, transaction} — this event already produced
			// an invoice (e.g. sync-confirm and webhook both fired). Idempotent
			// no-op, mirroring Notification's dedupeKey pattern.
			if ((err as { code?: number })?.code === 11000) {
				return InvoiceDB.findOne({ invoiceType: input.invoiceType, transaction: input.transaction._id });
			}
			throw err;
		}

		await ActivityLogService.log({
			actor: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
			actorType: input.createdBy ? 'user' : 'system',
			action: 'invoice.generated',
			targetType: 'Invoice',
			targetId: invoice._id.toString(),
			description: `Invoice ${invoice.invoiceNumber} generated (${TYPE_LABELS[invoice.invoiceType]})`,
		});

		try {
			const pdfBuffer = await this.renderInvoicePdf(invoice);
			const uploaded = await uploadToCloudinary(pdfBuffer, 'getmyguide/invoices');
			invoice.pdfUrl = uploaded.secure_url;
			await invoice.save();

			const sent = await sendInvoiceEmail(
				invoice.customerSnapshot.email,
				this.emailDetails(invoice),
				pdfBuffer,
				`${invoice.invoiceNumber}.pdf`
			);

			invoice.emailStatus = sent ? 'sent' : 'failed';
			await invoice.save();

			await ActivityLogService.log({
				actorType: 'system',
				action: sent ? 'invoice.email_sent' : 'invoice.email_failed',
				targetType: 'Invoice',
				targetId: invoice._id.toString(),
				description: `Invoice ${invoice.invoiceNumber} email ${sent ? 'sent' : 'failed'}`,
			});
		} catch (err) {
			logError('InvoiceService: PDF/email generation failed', {
				invoiceId: invoice._id.toString(),
				error: err,
			});
			invoice.emailStatus = 'failed';
			await invoice.save().catch(() => undefined);
		}

		return invoice;
	}

	private emailDetails(invoice: IInvoice) {
		return {
			customerName: invoice.customerSnapshot.name,
			invoiceNumber: invoice.invoiceNumber,
			invoiceTypeLabel: TYPE_LABELS[invoice.invoiceType],
			invoiceDate: invoice.invoiceDate.toDateString(),
			grandTotal: invoice.paymentInfo.grandTotal,
			currency: invoice.paymentInfo.currency,
			companyName: invoice.companyInfo.name,
			supportEmail: invoice.companyInfo.supportEmail,
		};
	}

	private async renderInvoicePdf(invoice: IInvoice): Promise<Buffer> {
		const doc = new PDFDocument({ size: 'A4', margin: 50 });
		const chunks: Buffer[] = [];
		doc.on('data', (chunk) => chunks.push(chunk));
		const done = new Promise<Buffer>((resolve) => {
			doc.on('end', () => resolve(Buffer.concat(chunks)));
		});

		doc.fontSize(20).fillColor('#000000').text(invoice.companyInfo.name);
		doc
			.fontSize(9)
			.fillColor('#666666')
			.text(invoice.companyInfo.address)
			.text(`${invoice.companyInfo.supportEmail} | ${invoice.companyInfo.supportPhone}`)
			.text(invoice.companyInfo.website);

		doc.moveDown(1.5);
		doc.fontSize(16).fillColor('#000000').text(`INVOICE — ${invoice.invoiceNumber}`);
		doc.fontSize(10).fillColor('#444444').text(TYPE_LABELS[invoice.invoiceType]);
		doc.moveDown(1);

		doc.fillColor('#000000').fontSize(10);
		doc.text(`Invoice Date: ${invoice.invoiceDate.toDateString()}`);
		doc.text(`Payment Date: ${new Date(invoice.paymentDate).toDateString()}`);
		doc.text(`Payment Status: ${invoice.paymentInfo.status.toUpperCase()}`);
		doc.text(`Payment ID: ${invoice.razorpayPaymentId ?? '-'}`);
		doc.text(`Order ID: ${invoice.razorpayOrderId ?? '-'}`);
		if (invoice.paymentInfo.method) {
			doc.text(`Payment Method: ${invoice.paymentInfo.method}`);
		}
		doc.moveDown(1);

		doc.fontSize(12).text('Bill To', { underline: true });
		doc.fontSize(10);
		doc.text(invoice.customerSnapshot.name);
		doc.text(invoice.customerSnapshot.email);
		doc.text(invoice.customerSnapshot.phone);
		if (invoice.customerSnapshot.country) doc.text(invoice.customerSnapshot.country);
		if (invoice.customerSnapshot.billingAddress) doc.text(invoice.customerSnapshot.billingAddress);
		doc.moveDown(1);

		if (invoice.guideSnapshot) {
			doc.fontSize(12).text('Guide', { underline: true });
			doc.fontSize(10);
			doc.text(invoice.guideSnapshot.name);
			doc.text(invoice.guideSnapshot.email);
			doc.text(invoice.guideSnapshot.phone);
			if (invoice.guideSnapshot.membershipPlan) doc.text(`Plan: ${invoice.guideSnapshot.membershipPlan}`);
			doc.moveDown(1);
		}

		if (invoice.bookingSnapshot) {
			doc.fontSize(12).text('Booking Details', { underline: true });
			doc.fontSize(10);
			doc.text(`Destination: ${invoice.bookingSnapshot.destination}`);
			if (invoice.bookingSnapshot.travelDate) {
				doc.text(`Travel Date: ${new Date(invoice.bookingSnapshot.travelDate).toDateString()}`);
			}
			if (invoice.bookingSnapshot.touristsCount) {
				doc.text(`Tourists: ${invoice.bookingSnapshot.touristsCount}`);
			}
			if (invoice.bookingSnapshot.assignedGuideName) {
				doc.text(`Assigned Guide: ${invoice.bookingSnapshot.assignedGuideName}`);
			}
			doc.moveDown(1);
		}

		doc.moveDown(0.5);
		const currency = invoice.paymentInfo.currency;
		const tableTop = doc.y;
		doc.fontSize(10).text('Description', 50, tableTop);
		doc.text('Amount', 400, tableTop, { width: 100, align: 'right' });
		doc
			.moveTo(50, tableTop + 15)
			.lineTo(550, tableTop + 15)
			.stroke();

		let rowY = tableTop + 22;
		doc.text(TYPE_LABELS[invoice.invoiceType], 50, rowY);
		doc.text(`${currency} ${invoice.paymentInfo.amount.toLocaleString()}`, 400, rowY, { width: 100, align: 'right' });
		rowY += 18;
		doc.text('Tax', 50, rowY);
		doc.text(`${currency} ${invoice.paymentInfo.tax.toLocaleString()}`, 400, rowY, { width: 100, align: 'right' });
		rowY += 18;
		doc.text('Discount', 50, rowY);
		doc.text(`- ${currency} ${invoice.paymentInfo.discount.toLocaleString()}`, 400, rowY, {
			width: 100,
			align: 'right',
		});
		rowY += 12;
		doc
			.moveTo(50, rowY + 8)
			.lineTo(550, rowY + 8)
			.stroke();
		rowY += 18;
		doc.fontSize(12).text('Grand Total', 50, rowY);
		doc.text(`${currency} ${invoice.paymentInfo.grandTotal.toLocaleString()}`, 400, rowY, {
			width: 100,
			align: 'right',
		});

		doc.y = rowY + 40;
		doc.x = 50;

		try {
			const qrData = `Invoice: ${invoice.invoiceNumber}\nDate: ${invoice.invoiceDate.toDateString()}\nAmount: ${currency} ${invoice.paymentInfo.grandTotal}`;
			const qrBuffer = await QRCode.toBuffer(qrData, { width: 100, margin: 1 });
			doc.image(qrBuffer, 50, doc.y, { width: 80 });
			doc.moveDown(6);
		} catch {
			// QR is a nice-to-have verification aid — never block PDF generation.
		}

		doc
			.fontSize(8)
			.fillColor('#999999')
			.text(
				`This is a system-generated invoice from ${invoice.companyInfo.name}. For support, contact ${invoice.companyInfo.supportEmail}.`,
				50,
				doc.y,
				{ align: 'center', width: 500 }
			);

		doc.end();
		return done;
	}

	private buildQuery(requestingUser: JWTPayload, filters: ListFilters): Record<string, unknown> {
		const query: Record<string, unknown> = {};

		if (requestingUser.role === 'tourist') {
			query.touristAccount = requestingUser.userId;
		} else if (requestingUser.role === 'guide') {
			query.guideAccount = requestingUser.userId;
		}

		if (filters.invoiceType) query.invoiceType = filters.invoiceType;
		if (filters.status) query.status = filters.status;
		if (filters.from || filters.to) {
			query.invoiceDate = {
				...(filters.from ? { $gte: new Date(filters.from) } : {}),
				...(filters.to ? { $lte: new Date(filters.to) } : {}),
			};
		}
		if (filters.search) {
			const regex = new RegExp(filters.search.trim(), 'i');
			query.$or = [
				{ invoiceNumber: regex },
				{ 'customerSnapshot.name': regex },
				{ 'customerSnapshot.email': regex },
				{ 'guideSnapshot.name': regex },
				{ razorpayPaymentId: regex },
			];
		}

		return query;
	}

	async list(requestingUser: JWTPayload, filters: ListFilters = {}, { page = 1, limit = 20 }: PageParams = {}) {
		const query = this.buildQuery(requestingUser, filters);

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			InvoiceDB.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			InvoiceDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getById(invoiceId: Types.ObjectId | string, requestingUser: JWTPayload): Promise<IInvoice> {
		const invoice = await InvoiceDB.findById(invoiceId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found');
		}

		if (requestingUser.role === 'admin') return invoice;
		if (requestingUser.role === 'tourist' && invoice.touristAccount?.toString() === requestingUser.userId) {
			return invoice;
		}
		if (requestingUser.role === 'guide' && invoice.guideAccount?.toString() === requestingUser.userId) {
			return invoice;
		}

		throw new ForbiddenError('You do not have access to this invoice');
	}

	async resend(invoiceId: Types.ObjectId | string): Promise<IInvoice> {
		const invoice = await InvoiceDB.findById(invoiceId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found');
		}

		const pdfBuffer = await this.renderInvoicePdf(invoice);
		if (!invoice.pdfUrl) {
			const uploaded = await uploadToCloudinary(pdfBuffer, 'getmyguide/invoices');
			invoice.pdfUrl = uploaded.secure_url;
		}

		const sent = await sendInvoiceEmail(
			invoice.customerSnapshot.email,
			this.emailDetails(invoice),
			pdfBuffer,
			`${invoice.invoiceNumber}.pdf`
		);

		invoice.emailStatus = sent ? 'sent' : 'failed';
		await invoice.save();

		await ActivityLogService.log({
			actorType: 'user',
			action: 'invoice.resent',
			targetType: 'Invoice',
			targetId: invoice._id.toString(),
			description: `Invoice ${invoice.invoiceNumber} resent`,
		});

		return invoice;
	}

	async downloadPdf(
		invoiceId: Types.ObjectId | string,
		requestingUser: JWTPayload
	): Promise<{ buffer: Buffer; filename: string }> {
		const invoice = await this.getById(invoiceId, requestingUser);
		const buffer = await this.renderInvoicePdf(invoice);
		return { buffer, filename: `${invoice.invoiceNumber}.pdf` };
	}

	async exportList(
		requestingUser: JWTPayload,
		filters: ListFilters,
		format: 'csv' | 'excel'
	): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
		const query = this.buildQuery(requestingUser, filters);
		const invoices = await InvoiceDB.find(query).sort({ createdAt: -1 }).lean();

		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet('Invoices');
		sheet.columns = [
			{ header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
			{ header: 'Type', key: 'invoiceType', width: 18 },
			{ header: 'Customer', key: 'customer', width: 25 },
			{ header: 'Guide', key: 'guide', width: 25 },
			{ header: 'Amount', key: 'amount', width: 12 },
			{ header: 'Status', key: 'status', width: 12 },
			{ header: 'Payment Status', key: 'emailStatus', width: 14 },
			{ header: 'Invoice Date', key: 'invoiceDate', width: 18 },
		];
		invoices.forEach((inv) => {
			sheet.addRow({
				invoiceNumber: inv.invoiceNumber,
				invoiceType: TYPE_LABELS[inv.invoiceType],
				customer: inv.customerSnapshot?.name ?? '',
				guide: inv.guideSnapshot?.name ?? '',
				amount: inv.paymentInfo?.grandTotal ?? 0,
				status: inv.status,
				emailStatus: inv.emailStatus,
				invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toDateString() : '',
			});
		});

		if (format === 'csv') {
			const buffer = (await workbook.csv.writeBuffer()) as unknown as Buffer;
			return { buffer, filename: 'invoices.csv', contentType: 'text/csv' };
		}

		const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
		return {
			buffer,
			filename: 'invoices.xlsx',
			contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		};
	}
}

export default new InvoiceService();
