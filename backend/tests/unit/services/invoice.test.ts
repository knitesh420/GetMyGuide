import { AccountDB, BookingDB, GuideDB, InvoiceDB, TransactionDB, TripDB, AssignmentDB } from '@mongo';
import { Types } from 'mongoose';
import { ForbiddenError, NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

jest.mock('@provider/email', () => ({
	sendInvoiceEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('@provider/razorpay', () => ({
	__esModule: true,
	default: {
		payments: {
			getPayment: jest.fn().mockResolvedValue({ method: 'card' }),
		},
	},
}));

jest.mock('@utils/cloudinaryUpload', () => ({
	__esModule: true,
	default: jest.fn().mockResolvedValue({ secure_url: 'https://cloudinary.test/invoice.pdf' }),
}));

import { sendInvoiceEmail } from '@provider/email';
import InvoiceService from '@services/invoice';

function bookingFixture(overrides: Partial<Record<string, any>> = {}) {
	return {
		tourist_info: {
			name: 'Jane Doe',
			gender: 'female' as const,
			phone: '+1234567890',
			email: 'jane@example.com',
			country: 'USA',
		},
		travel_details: {
			places: ['Amber Fort'],
			city: 'Jaipur',
			date: new Date('2026-12-25'),
			no_of_person: 2,
			preferences: { hotel: true, taxi: false },
		},
		guide_preferences: {
			guide_language: ['English'],
			gender: 'none' as const,
		},
		booking_configuration: {
			duration: 'full-day' as const,
			foreign_language_required: false,
			early_late_hours: false,
			extra_city_allowances: false,
			special_event_allowances: [],
			price: 5000,
		},
		transaction_id: `txn-${new Types.ObjectId().toString()}`,
		status: 'successful' as const,
		...overrides,
	};
}

async function transactionFixture(overrides: Partial<Record<string, any>> = {}) {
	return TransactionDB.create({
		reference_id: new Types.ObjectId().toString(),
		reference_type: 'booking',
		type: 'tourist',
		razorpay_order_id: `order_${Math.random().toString(36).slice(2)}`,
		razorpay_customer_id: `cust_${Math.random().toString(36).slice(2)}`,
		razorpay_payment_id: `pay_${Math.random().toString(36).slice(2)}`,
		transaction_id: `txn-${new Types.ObjectId().toString()}`,
		status: 'paid',
		amount: 5000,
		currency: 'INR',
		...overrides,
	});
}

describe('InvoiceService', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();
		(sendInvoiceEmail as jest.Mock).mockResolvedValue(true);
	});

	describe('createBookingInvoice', () => {
		it('generates a sequential invoice number and a paid booking invoice', async () => {
			const transaction = await transactionFixture();
			const booking = await BookingDB.create(
				bookingFixture({ transaction_id: transaction.transaction_id })
			);

			const invoice = await InvoiceService.createBookingInvoice(transaction, booking);

			expect(invoice).toBeTruthy();
			expect(invoice!.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
			expect(invoice!.invoiceType).toBe('booking');
			expect(invoice!.customerSnapshot.email).toBe('jane@example.com');
			expect(invoice!.paymentInfo.amount).toBe(5000);
			expect(invoice!.paymentInfo.grandTotal).toBe(5000);
			expect(invoice!.paymentInfo.method).toBe('card');
			expect(invoice!.pdfUrl).toBe('https://cloudinary.test/invoice.pdf');
			expect(invoice!.emailStatus).toBe('sent');
			expect(sendInvoiceEmail).toHaveBeenCalledTimes(1);
		});

		it('is idempotent — a duplicate call for the same transaction returns the existing invoice', async () => {
			const transaction = await transactionFixture();
			const booking = await BookingDB.create(
				bookingFixture({ transaction_id: transaction.transaction_id })
			);

			const first = await InvoiceService.createBookingInvoice(transaction, booking);
			const second = await InvoiceService.createBookingInvoice(transaction, booking);

			expect(second!._id.toString()).toBe(first!._id.toString());
			expect(await InvoiceDB.countDocuments({ invoiceType: 'booking', transaction: transaction._id })).toBe(1);
		});

		it('increments the invoice number across separate invoices', async () => {
			const txn1 = await transactionFixture();
			const booking1 = await BookingDB.create(bookingFixture({ transaction_id: txn1.transaction_id }));
			const invoice1 = await InvoiceService.createBookingInvoice(txn1, booking1);

			const txn2 = await transactionFixture();
			const booking2 = await BookingDB.create(bookingFixture({ transaction_id: txn2.transaction_id }));
			const invoice2 = await InvoiceService.createBookingInvoice(txn2, booking2);

			const seq1 = Number(invoice1!.invoiceNumber.split('-')[2]);
			const seq2 = Number(invoice2!.invoiceNumber.split('-')[2]);
			expect(seq2).toBe(seq1 + 1);
		});
	});

	describe('createMembershipInvoice', () => {
		it('generates a guide membership invoice with a guide snapshot', async () => {
			const account = await AccountDB.create({
				name: 'Guide One',
				email: 'guide1@example.com',
				phone: '+1000000001',
				password: 'password123',
				role: 'guide',
			});
			const guide = await GuideDB.create({
				accountId: account._id,
				city: 'Jaipur',
				registrationCompleted: true,
				isVisible: true,
			});
			await transactionFixture({
				reference_id: guide._id.toString(),
				reference_type: 'guide_membership',
				type: 'guide',
			});

			const invoice = await InvoiceService.createMembershipInvoice(guide);

			expect(invoice).toBeTruthy();
			expect(invoice!.invoiceType).toBe('guide_membership');
			expect(invoice!.guideSnapshot?.email).toBe('guide1@example.com');
			expect(invoice!.customerSnapshot.name).toBe('Guide One');
		});

		it('returns null if no membership transaction exists yet', async () => {
			const account = await AccountDB.create({
				name: 'Guide Two',
				email: 'guide2@example.com',
				phone: '+1000000002',
				password: 'password123',
				role: 'guide',
			});
			const guide = await GuideDB.create({ accountId: account._id, registrationCompleted: true });

			const invoice = await InvoiceService.createMembershipInvoice(guide);

			expect(invoice).toBeNull();
		});
	});

	describe('createTripCompletionInvoice', () => {
		it('generates a trip completion invoice with booking and guide snapshots', async () => {
			const guideAccount = await AccountDB.create({
				name: 'Guide Three',
				email: 'guide3@example.com',
				phone: '+1000000003',
				password: 'password123',
				role: 'guide',
			});
			const touristAccount = await AccountDB.create({
				name: 'Jane Doe',
				email: 'jane@example.com',
				phone: '+1000000004',
				password: 'password123',
				role: 'tourist',
			});
			const transaction = await transactionFixture();
			const booking = await BookingDB.create(
				bookingFixture({
					transaction_id: transaction.transaction_id,
					linked_to: touristAccount._id,
					allocated_guide: guideAccount._id,
				})
			);
			const assignment = await AssignmentDB.create({
				booking: booking._id,
				guide: guideAccount._id,
				assignedBy: touristAccount._id,
				status: 'accepted',
				respondedAt: new Date(),
			});
			const trip = await TripDB.create({
				booking: booking._id,
				assignment: assignment._id,
				guide: guideAccount._id,
				status: 'completed',
				completedAt: new Date(),
			});

			const invoice = await InvoiceService.createTripCompletionInvoice(trip);

			expect(invoice).toBeTruthy();
			expect(invoice!.invoiceType).toBe('trip_completion');
			expect(invoice!.bookingSnapshot?.assignedGuideName).toBe('Guide Three');
			expect(invoice!.guideSnapshot?.email).toBe('guide3@example.com');
		});
	});

	describe('list + getById RBAC scoping', () => {
		it('scopes the list to the requesting tourist/guide, and lets admin see everything', async () => {
			const touristAccount = await AccountDB.create({
				name: 'Jane Doe',
				email: 'jane@example.com',
				phone: '+1000000005',
				password: 'password123',
				role: 'tourist',
			});
			const otherTouristAccount = await AccountDB.create({
				name: 'John Roe',
				email: 'john@example.com',
				phone: '+1000000006',
				password: 'password123',
				role: 'tourist',
			});

			const txn1 = await transactionFixture();
			const booking1 = await BookingDB.create(
				bookingFixture({ transaction_id: txn1.transaction_id, linked_to: touristAccount._id })
			);
			const invoice1 = await InvoiceService.createBookingInvoice(txn1, booking1);

			const txn2 = await transactionFixture();
			const booking2 = await BookingDB.create(
				bookingFixture({ transaction_id: txn2.transaction_id, linked_to: otherTouristAccount._id })
			);
			await InvoiceService.createBookingInvoice(txn2, booking2);

			const touristPayload = {
				userId: touristAccount._id.toString(),
				role: 'tourist' as const,
				email: 'jane@example.com',
				name: 'Jane Doe',
				tokenVersion: 0,
			};
			const adminPayload = {
				userId: new Types.ObjectId().toString(),
				role: 'admin' as const,
				email: 'admin@example.com',
				name: 'Admin',
				tokenVersion: 0,
			};

			const touristList = await InvoiceService.list(touristPayload);
			expect(touristList.total).toBe(1);
			expect(touristList.data[0]._id.toString()).toBe(invoice1!._id.toString());

			const adminList = await InvoiceService.list(adminPayload);
			expect(adminList.total).toBe(2);
		});

		it('forbids a tourist from fetching another tourist invoice by id', async () => {
			const touristAccount = await AccountDB.create({
				name: 'Jane Doe',
				email: 'jane@example.com',
				phone: '+1000000007',
				password: 'password123',
				role: 'tourist',
			});
			const otherTouristAccount = await AccountDB.create({
				name: 'John Roe',
				email: 'john@example.com',
				phone: '+1000000008',
				password: 'password123',
				role: 'tourist',
			});
			const txn = await transactionFixture();
			const booking = await BookingDB.create(
				bookingFixture({ transaction_id: txn.transaction_id, linked_to: touristAccount._id })
			);
			const invoice = await InvoiceService.createBookingInvoice(txn, booking);

			await expect(
				InvoiceService.getById(invoice!._id, {
					userId: otherTouristAccount._id.toString(),
					role: 'tourist',
					email: 'john@example.com',
					name: 'John Roe',
					tokenVersion: 0,
				})
			).rejects.toThrow(ForbiddenError);
		});

		it('throws NotFoundError for an unknown invoice id', async () => {
			await expect(
				InvoiceService.getById(new Types.ObjectId(), {
					userId: new Types.ObjectId().toString(),
					role: 'admin',
					email: 'admin@example.com',
					name: 'Admin',
					tokenVersion: 0,
				})
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('resend', () => {
		it('re-sends the invoice email and updates emailStatus', async () => {
			const transaction = await transactionFixture();
			const booking = await BookingDB.create(
				bookingFixture({ transaction_id: transaction.transaction_id })
			);
			const invoice = await InvoiceService.createBookingInvoice(transaction, booking);
			(sendInvoiceEmail as jest.Mock).mockClear();

			const resent = await InvoiceService.resend(invoice!._id);

			expect(sendInvoiceEmail).toHaveBeenCalledTimes(1);
			expect(resent.emailStatus).toBe('sent');
		});
	});
});
