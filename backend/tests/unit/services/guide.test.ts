import { GuideEnrollmentDB } from '@mongo';
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

import { sendGuidePaymentConfirmationEmail } from '@provider/email';
import TransactionService from '@services/transaction';

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
		it('should create a new enrollment and return payment options', async () => {
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

			expect(result.enrollment_id).toBeDefined();
			expect(result.transaction_id).toBe('trans_test123');
			expect(result.razorpay_options.order_id).toBe('order_test123');

			expect(TransactionService.createTransaction).toHaveBeenCalledWith(
				{
					name: 'John Doe',
					email: 'john@example.com',
					phone_number: '+1234567890',
				},
				500,
				expect.objectContaining({
					reference_type: 'enrollment',
					description: 'Guide Registration Fee - Rs 500',
				})
			);

			const enrollment = await GuideEnrollmentDB.findOne({ email: 'john@example.com' });
			expect(enrollment).toBeTruthy();
			expect(enrollment?.name).toBe('John Doe');
			expect(enrollment?.type).toBe('normal');
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
		it('should verify payment, create guide account, and send confirmation email', async () => {
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

			const mockTransaction = {
				_id: new Types.ObjectId(),
				reference_id: enrollment._id.toString(),
				reference_type: 'enrollment',
				razorpay_order_id: 'order_test123',
				transaction_id: 'trans_test123',
				status: 'paid',
			};

			(TransactionService.getTransactionStatus as jest.Mock).mockResolvedValue({
				transaction_id: 'trans_test123',
				status: 'paid',
				order_status: 'paid',
				amount: 500,
				currency: 'INR',
			});

			(TransactionService.getTransaction as jest.Mock).mockResolvedValue(mockTransaction);

			const result = await GuideService.confirmPayment(enrollment._id, 'trans_test123');

			expect(TransactionService.getTransactionStatus).toHaveBeenCalledWith('trans_test123');
			expect(TransactionService.getTransaction).toHaveBeenCalledWith('trans_test123');

			expect(result.message).toContain('Payment confirmed successfully');

			// Verify confirmation email was sent
			expect(sendGuidePaymentConfirmationEmail).toHaveBeenCalledTimes(1);
		});

		it('should throw NotFoundError if transaction not found', async () => {
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

			(TransactionService.getTransactionStatus as jest.Mock).mockRejectedValue(
				new NotFoundError('Transaction not found')
			);

			await expect(
				GuideService.confirmPayment(enrollment._id, 'invalid_transaction_id')
			).rejects.toThrow(NotFoundError);
		});

		it('should throw ServerError if payment not completed', async () => {
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

			const mockTransaction = {
				_id: new Types.ObjectId(),
				reference_id: enrollment._id.toString(),
				reference_type: 'enrollment',
				razorpay_order_id: 'order_test123',
				transaction_id: 'trans_test123',
				status: 'created',
			};

			(TransactionService.getTransactionStatus as jest.Mock).mockResolvedValue({
				transaction_id: 'trans_test123',
				status: 'created',
				order_status: 'created',
				amount: 500,
				currency: 'INR',
			});

			(TransactionService.getTransaction as jest.Mock).mockResolvedValue(mockTransaction);

			await expect(GuideService.confirmPayment(enrollment._id, 'trans_test123')).rejects.toThrow(
				ServerError
			);
		});
	});
});
