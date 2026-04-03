import { AccountDB, GuideEnrollmentDB } from '@mongo';
import GuideService from '@services/guide';
import { Types } from 'mongoose';
import { NotFoundError, ServerError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

// Mock TransactionService
jest.mock('@services/transaction', () => ({
	__esModule: true,
	default: {
		createTransaction: jest.fn(),
		getTransactionStatus: jest.fn(),
		getTransaction: jest.fn(),
		getTransactionByReference: jest.fn(),
	},
}));

// Mock email provider
jest.mock('@provider/email', () => ({
	sendGuidePaymentConfirmationEmail: jest.fn().mockResolvedValue(true),
}));

// Mock paymentVerify
jest.mock('@utils/paymentVerify', () => ({
	verifyRazorpaySignature: jest.fn(),
}));

import { sendGuidePaymentConfirmationEmail } from '@provider/email';
import TransactionService from '@services/transaction';
import { verifyRazorpaySignature } from '@utils/paymentVerify';

describe('Guide Service', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();
		(sendGuidePaymentConfirmationEmail as jest.Mock).mockResolvedValue(true);
		(TransactionService.createTransaction as jest.Mock).mockClear();
		(TransactionService.getTransactionStatus as jest.Mock).mockClear();
		(TransactionService.getTransaction as jest.Mock).mockClear();
		(TransactionService.getTransactionByReference as jest.Mock).mockClear();
	});

	describe('enroll', () => {
		it('should NOT save enrollment to DB and should return encoded enrollment_data', async () => {
			const enrollData = {
				name: 'John Doe',
				email: 'john@example.com',
				phone: '+1234567890',
				city: 'Mumbai',
				type: 'normal' as const,
				pan: 'ABCDE1234F',
				licence: 'licence.pdf',
				aadhar: 'aadhar.pdf',
				languages: ['English', 'Hindi'],
				photo: 'photo.jpg',
			};

			const mockTransaction = {
				transaction_id: 'trans_test123',
				razorpay_options: {
					description: 'Guide Registration Fee - Rs 500',
					currency: 'INR',
					amount: 50000,
					name: 'Get My Guide',
					order_id: 'order_test123',
					prefill: {
						name: 'John Doe',
						contact: '+1234567890',
						email: 'john@example.com',
					},
					key: 'test_key',
				},
			};

			(TransactionService.createTransaction as jest.Mock).mockResolvedValue(mockTransaction);

			const result = await GuideService.enroll(enrollData);

			expect(result.enrollment_data).toBeDefined();
			expect(result.transaction_id).toBe('trans_test123');
			expect(result.razorpay_options.order_id).toBe('order_test123');

			// Verify enrollment was NOT saved to DB
			const enrollment = await GuideEnrollmentDB.findOne({ email: 'john@example.com' });
			expect(enrollment).toBeNull();

			expect(TransactionService.createTransaction).toHaveBeenCalledWith(
				{
					name: 'John Doe',
					email: 'john@example.com',
					phone_number: '+1234567890',
				},
				500,
				expect.objectContaining({
					reference_type: 'pending_enrollment',
					description: 'Guide Registration Fee - Rs 500',
				})
			);
		});
	});

	describe('getAllEnrollments', () => {
		it('should return all enrollments sorted by creation date', async () => {
			await GuideEnrollmentDB.create({
				name: 'Guide 1',
				email: 'guide1@example.com',
				phone: '+1234567891',
				city: 'Delhi',
				type: 'normal',
				pan: 'PAN001',
				licence: 'lic1.pdf',
				aadhar: 'aad1.pdf',
				languages: ['English'],
				photo: 'photo1.jpg',
			});

			await GuideEnrollmentDB.create({
				name: 'Guide 2',
				email: 'guide2@example.com',
				phone: '+1234567892',
				city: 'Bangalore',
				type: 'escort',
				pan: 'PAN002',
				licence: 'lic2.pdf',
				aadhar: 'aad2.pdf',
				languages: ['English', 'Kannada'],
				photo: 'photo2.jpg',
			});

			(TransactionService.getTransactionByReference as jest.Mock).mockRejectedValue(
				new Error('Not found')
			);

			const enrollments = await GuideService.getAllEnrollments();

			expect(enrollments).toHaveLength(2);
			expect(enrollments[0].email).toBe('guide2@example.com'); // Newest first
			expect(enrollments[1].email).toBe('guide1@example.com');
		});
	});

	describe('getEnrollmentById', () => {
		it('should return enrollment by ID', async () => {
			const enrollment = await GuideEnrollmentDB.create({
				name: 'Test Guide',
				email: 'test@example.com',
				phone: '+1234567890',
				city: 'Mumbai',
				type: 'normal',
				pan: 'PAN123',
				licence: 'lic.pdf',
				aadhar: 'aad.pdf',
				languages: ['English'],
				photo: 'photo.jpg',
			});

			const result = await GuideService.getEnrollmentById(enrollment._id);

			expect(result.id).toBe(enrollment._id.toString());
			expect(result.email).toBe('test@example.com');
		});

		it('should throw NotFoundError if enrollment not found', async () => {
			const fakeId = new Types.ObjectId();

			await expect(GuideService.getEnrollmentById(fakeId)).rejects.toThrow(NotFoundError);
		});
	});

	describe('confirmPayment', () => {
		const enrollData = {
			name: 'Test Guide',
			email: 'test@example.com',
			phone: '+1234567890',
			city: 'Mumbai',
			type: 'normal' as const,
			licence: 'lic.pdf',
			aadhar: 'aad.pdf',
			languages: ['English'],
			photo: 'photo.jpg',
		};

		const enrollment_data = Buffer.from(JSON.stringify(enrollData)).toString('base64');

		it('should verify signature, save enrollment, create guide account, and send email', async () => {
			const mockTransaction = {
				_id: new Types.ObjectId(),
				reference_id: 'temp_ref',
				reference_type: 'pending_enrollment',
				razorpay_order_id: 'order_test123',
				transaction_id: 'trans_test123',
				status: 'created',
				save: jest.fn(),
			};

			(verifyRazorpaySignature as jest.Mock).mockReturnValue(true);
			(TransactionService.getTransaction as jest.Mock).mockResolvedValue(mockTransaction);

			const result = await GuideService.confirmPayment({
				transaction_id: 'trans_test123',
				razorpay_order_id: 'order_test123',
				razorpay_payment_id: 'pay_test123',
				razorpay_signature: 'valid_signature',
				enrollment_data,
			});

			expect(verifyRazorpaySignature).toHaveBeenCalledWith(
				'order_test123',
				'pay_test123',
				'valid_signature'
			);
			expect(result.message).toContain('Payment confirmed successfully');
			expect(sendGuidePaymentConfirmationEmail).toHaveBeenCalledTimes(1);

			// Verify enrollment was saved to DB
			const enrollment = await GuideEnrollmentDB.findOne({ email: 'test@example.com' });
			expect(enrollment).toBeTruthy();

			// Verify guide account was created
			const account = await AccountDB.findOne({ email: 'test@example.com' });
			expect(account).toBeTruthy();
			expect(account?.role).toBe('guide');

			// Verify transaction was updated
			expect(mockTransaction.save).toHaveBeenCalled();
			expect(mockTransaction.status).toBe('paid');
		});

		it('should throw ServerError if signature is invalid', async () => {
			(verifyRazorpaySignature as jest.Mock).mockReturnValue(false);

			await expect(
				GuideService.confirmPayment({
					transaction_id: 'trans_test123',
					razorpay_order_id: 'order_test123',
					razorpay_payment_id: 'pay_test123',
					razorpay_signature: 'invalid_signature',
					enrollment_data,
				})
			).rejects.toThrow(ServerError);

			// Verify nothing was saved to DB
			const enrollment = await GuideEnrollmentDB.findOne({ email: 'test@example.com' });
			expect(enrollment).toBeNull();
		});

		it('should throw ServerError if order ID does not match transaction', async () => {
			const mockTransaction = {
				razorpay_order_id: 'order_different',
				transaction_id: 'trans_test123',
			};

			(verifyRazorpaySignature as jest.Mock).mockReturnValue(true);
			(TransactionService.getTransaction as jest.Mock).mockResolvedValue(mockTransaction);

			await expect(
				GuideService.confirmPayment({
					transaction_id: 'trans_test123',
					razorpay_order_id: 'order_test123',
					razorpay_payment_id: 'pay_test123',
					razorpay_signature: 'valid_signature',
					enrollment_data,
				})
			).rejects.toThrow(ServerError);
		});
	});
});
