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
	},
}));

// Mock email provider
jest.mock('@provider/email', () => ({
	sendGuideCredentialsEmail: jest.fn().mockResolvedValue(true),
	sendPaymentLinkEmail: jest.fn().mockResolvedValue(true),
}));

import { sendGuideCredentialsEmail, sendPaymentLinkEmail } from '@provider/email';
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
		// Reset email mocks to return true
		(sendGuideCredentialsEmail as jest.Mock).mockResolvedValue(true);
		(sendPaymentLinkEmail as jest.Mock).mockResolvedValue(true);
		// Reset TransactionService mocks
		(TransactionService.createTransaction as jest.Mock).mockClear();
		(TransactionService.getTransactionStatus as jest.Mock).mockClear();
		(TransactionService.getTransaction as jest.Mock).mockClear();
	});

	describe('enroll', () => {
		it('should create a new enrollment with unverified status', async () => {
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

			const result = await GuideService.enroll(enrollData);

			expect(result.message).toBe(
				'Enrollment submitted successfully. Your application is under review.'
			);

			const enrollment = await GuideEnrollmentDB.findOne({ email: 'john@example.com' });
			expect(enrollment).toBeTruthy();
			expect(enrollment?.status).toBe('unverified');
			expect(enrollment?.name).toBe('John Doe');
			expect(enrollment?.type).toBe('normal');
		});
	});

	describe('getAllEnrollments', () => {
		it('should return all enrollments sorted by creation date', async () => {
			// Create test enrollments
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
				status: 'unverified',
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
				status: 'payment-pending',
			});

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
				status: 'unverified',
			});

			const result = await GuideService.getEnrollmentById(enrollment._id);

			expect(result.id).toBe(enrollment._id.toString());
			expect(result.email).toBe('test@example.com');
			expect(result.status).toBe('unverified');
		});

		it('should throw NotFoundError if enrollment not found', async () => {
			const fakeId = new Types.ObjectId();

			await expect(GuideService.getEnrollmentById(fakeId)).rejects.toThrow(NotFoundError);
		});
	});

	describe('updateEnrollmentStatus', () => {
		it('should update enrollment status and send payment link email when status is payment-pending', async () => {
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
				status: 'unverified',
			});

			const result = await GuideService.updateEnrollmentStatus(enrollment._id, 'payment-pending');

			expect(result.status).toBe('payment-pending');
			expect(sendPaymentLinkEmail).toHaveBeenCalledTimes(1);
			expect(sendPaymentLinkEmail).toHaveBeenCalledWith(
				'test@example.com',
				'Test Guide',
				expect.stringContaining(enrollment._id.toString())
			);

			const updated = await GuideEnrollmentDB.findById(enrollment._id);
			expect(updated?.status).toBe('payment-pending');
		});

		it('should update enrollment status without sending email for other statuses', async () => {
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
				status: 'unverified',
			});

			const result = await GuideService.updateEnrollmentStatus(enrollment._id, 'verified');

			expect(result.status).toBe('verified');
			expect(sendPaymentLinkEmail).not.toHaveBeenCalled();

			const updated = await GuideEnrollmentDB.findById(enrollment._id);
			expect(updated?.status).toBe('verified');
		});

		it('should throw NotFoundError if enrollment not found', async () => {
			const fakeId = new Types.ObjectId();

			await expect(GuideService.updateEnrollmentStatus(fakeId, 'payment-pending')).rejects.toThrow(
				NotFoundError
			);
		});
	});

	describe('requestPaymentLink', () => {
		it('should create transaction using TransactionService and return payment options', async () => {
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
				status: 'payment-pending',
			});

			const mockTransaction = {
				transaction_id: 'trans_test123',
				razorpay_options: {
					description: 'Get My Guide Enrollment Payment',
					currency: 'INR',
					amount: 50000,
					name: 'Get My Guide',
					order_id: 'order_test123',
					prefill: {
						name: 'Test Guide',
						contact: '+1234567890',
						email: 'test@example.com',
					},
					key: 'test_key',
				},
			};

			(TransactionService.createTransaction as jest.Mock).mockResolvedValue(mockTransaction);

			const result = await GuideService.requestPaymentLink(enrollment._id);

			expect(TransactionService.createTransaction).toHaveBeenCalledWith(
				{
					name: 'Test Guide',
					email: 'test@example.com',
					phone_number: '+1234567890',
				},
				500,
				{
					reference_id: enrollment._id.toString(),
					reference_type: 'enrollment',
					data: {
						enrollment_id: enrollment._id.toString(),
					},
					description: 'Get My Guide Enrollment Payment',
				}
			);

			expect(result.data).toHaveProperty('transaction_id');
			expect(result.data.razorpay_options.order_id).toBe('order_test123');
			expect(result.data.razorpay_options.amount).toBe(50000);
			expect(result.data.razorpay_options.currency).toBe('INR');
		});

		it('should throw NotFoundError if enrollment not found', async () => {
			const fakeId = new Types.ObjectId();

			await expect(GuideService.requestPaymentLink(fakeId)).rejects.toThrow(NotFoundError);
		});

		it('should throw NotFoundError if enrollment status is not payment-pending', async () => {
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
				status: 'unverified',
			});

			await expect(GuideService.requestPaymentLink(enrollment._id)).rejects.toThrow(NotFoundError);
		});
	});

	describe('confirmPayment', () => {
		it('should verify payment, create guide account, and send credentials', async () => {
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
				status: 'payment-pending',
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

			// Verify enrollment status updated
			const updatedEnrollment = await GuideEnrollmentDB.findById(enrollment._id);
			expect(updatedEnrollment?.status).toBe('verified');

			// Verify credentials email was sent
			expect(sendGuideCredentialsEmail).toHaveBeenCalledTimes(1);
			expect(sendGuideCredentialsEmail).toHaveBeenCalledWith(
				'test@example.com',
				'test@example.com',
				expect.any(String)
			);
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
				status: 'payment-pending',
			});

			(TransactionService.getTransaction as jest.Mock).mockRejectedValue(
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
				status: 'payment-pending',
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
