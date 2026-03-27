import { AccountDB, GuideEnrollmentDB, TransactionDB } from '@mongo';
import AuthService from '@services/auth';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import configServer from '../../src/server-config';
import { testSignupData } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

// Mock Razorpay APIs
jest.mock('@provider/razorpay/api/customers', () => ({
	__esModule: true,
	default: {
		createCustomer: jest.fn(),
	},
}));

jest.mock('@provider/razorpay/api/orders', () => ({
	__esModule: true,
	default: {
		createOrder: jest.fn(),
		getOrderStatus: jest.fn(),
	},
}));

// Mock email provider
jest.mock('@provider/email', () => ({
	sendGuideCredentialsEmail: jest.fn().mockResolvedValue(true),
	sendPaymentLinkEmail: jest.fn().mockResolvedValue(true),
	sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
	sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

import { sendGuideCredentialsEmail, sendPaymentLinkEmail } from '@provider/email';
import RazorpayCustomers from '@provider/razorpay/api/customers';
import RazorpayOrders from '@provider/razorpay/api/orders';

describe('Guide API Integration Tests', () => {
	let app: express.Application;
	let adminToken: string;
	const testUploadDir = path.join(__dirname, '../../static/misc');

	// Create test PDF buffer
	const createPDFBuffer = () => {
		// Minimal PDF header
		return Buffer.from('%PDF-1.4\n');
	};

	// Create test image buffer
	const createImageBuffer = () => {
		return Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
			'base64'
		);
	};

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);

		// Ensure test upload directory exists
		if (!fs.existsSync(testUploadDir)) {
			fs.mkdirSync(testUploadDir, { recursive: true });
		}

		// Create admin user
		const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
		const adminResult = await AuthService.signup(adminData);
		adminToken = adminResult.token;
	});

	afterAll(async () => {
		await disconnectTestDB();
		// Clean up test files
		if (fs.existsSync(testUploadDir)) {
			const files = fs.readdirSync(testUploadDir);
			files.forEach((file) => {
				try {
					fs.unlinkSync(path.join(testUploadDir, file));
				} catch {
					// Ignore errors during cleanup
				}
			});
		}
	});

	beforeEach(async () => {
		await clearDatabase();

		// Recreate admin after clearing database
		const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
		const adminResult = await AuthService.signup(adminData);
		adminToken = adminResult.token;

		jest.clearAllMocks();
		// Reset email mocks to return true
		(sendGuideCredentialsEmail as jest.Mock).mockResolvedValue(true);
		(sendPaymentLinkEmail as jest.Mock).mockResolvedValue(true);
	});

	describe('POST /guide/enroll', () => {
		it('should successfully enroll a guide', async () => {
			const pdfBuffer = createPDFBuffer();
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/guide/enroll')
				.field('name', 'John Doe')
				.field('email', 'john@example.com')
				.field('phone', '+1234567890')
				.field('city', 'Mumbai')
				.field('type', 'normal')
				.field('pan', 'ABCDE1234F')
				.field('languages', JSON.stringify(['English', 'Hindi']))
				.attach('licence', pdfBuffer, 'licence.pdf')
				.attach('aadhar', pdfBuffer, 'aadhar.pdf')
				.attach('photo', imageBuffer, 'photo.jpg');

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.message).toContain('Enrollment submitted successfully');

			// Verify enrollment was created
			const enrollment = await GuideEnrollmentDB.findOne({ email: 'john@example.com' });
			expect(enrollment).toBeTruthy();
			expect(enrollment?.status).toBe('unverified');
		});

		it('should reject enrollment with missing required fields', async () => {
			const pdfBuffer = createPDFBuffer();
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/guide/enroll')
				.field('name', 'John Doe')
				.field('email', 'john@example.com')
				// Missing phone, city, etc.
				.attach('licence', pdfBuffer, 'licence.pdf')
				.attach('aadhar', pdfBuffer, 'aadhar.pdf')
				.attach('photo', imageBuffer, 'photo.jpg');

			expect(response.status).toBe(400);
		});

		it('should reject enrollment with invalid email', async () => {
			const pdfBuffer = createPDFBuffer();
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/guide/enroll')
				.field('name', 'John Doe')
				.field('email', 'invalid-email')
				.field('phone', '+1234567890')
				.field('city', 'Mumbai')
				.field('type', 'normal')
				.field('pan', 'ABCDE1234F')
				.field('languages', JSON.stringify(['English']))
				.attach('licence', pdfBuffer, 'licence.pdf')
				.attach('aadhar', pdfBuffer, 'aadhar.pdf')
				.attach('photo', imageBuffer, 'photo.jpg');

			expect(response.status).toBe(400);
		});

		it('should reject enrollment with missing files', async () => {
			const pdfBuffer = createPDFBuffer();

			const response = await request(app)
				.post('/guide/enroll')
				.field('name', 'John Doe')
				.field('email', 'john@example.com')
				.field('phone', '+1234567890')
				.field('city', 'Mumbai')
				.field('type', 'normal')
				.field('pan', 'ABCDE1234F')
				.field('languages', JSON.stringify(['English']))
				.attach('licence', pdfBuffer, 'licence.pdf')
				// Missing aadhar and photo
				.attach('aadhar', pdfBuffer, 'aadhar.pdf');

			expect(response.status).toBe(400);
		});
	});

	describe('GET /guide/list-all', () => {
		it('should return all enrollments for admin', async () => {
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

			const response = await request(app)
				.get('/guide/list-all')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.enrollments).toHaveLength(2);
		});

		it('should reject request without authentication', async () => {
			const response = await request(app).get('/guide/list-all');

			expect(response.status).toBe(401);
		});

		it('should reject request from non-admin user', async () => {
			// Create regular user
			const userResult = await AuthService.signup(testSignupData);
			const userToken = userResult.token;

			const response = await request(app)
				.get('/guide/list-all')
				.set('Authorization', `Bearer ${userToken}`);

			expect(response.status).toBe(401);
		});
	});

	describe('GET /guide/enroll-status/:id', () => {
		it('should return enrollment status (public)', async () => {
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

			const response = await request(app).get(`/guide/enroll-status/${enrollment._id}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.status).toBe('payment-pending');
			expect(response.body.id).toBe(enrollment._id.toString());
		});

		it('should return 404 for non-existent enrollment', async () => {
			const fakeId = '507f1f77bcf86cd799439011';

			const response = await request(app).get(`/guide/enroll-status/${fakeId}`);

			expect(response.status).toBe(404);
		});
	});

	describe('POST /guide/enroll-status/:id', () => {
		it('should update enrollment status and send payment email (admin only)', async () => {
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

			const response = await request(app)
				.post(`/guide/enroll-status/${enrollment._id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'payment-pending' });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.status).toBe('payment-pending');

			// Verify email was sent
			const { sendPaymentLinkEmail } = require('@provider/email');
			expect(sendPaymentLinkEmail).toHaveBeenCalled();

			// Verify status was updated
			const updated = await GuideEnrollmentDB.findById(enrollment._id);
			expect(updated?.status).toBe('payment-pending');
		});

		it('should reject request from non-admin user', async () => {
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

			// Create regular user
			const userResult = await AuthService.signup({
				...testSignupData,
				email: 'user@example.com',
			});
			const userToken = userResult.token;

			const response = await request(app)
				.post(`/guide/enroll-status/${enrollment._id}`)
				.set('Authorization', `Bearer ${userToken}`)
				.send({ status: 'payment-pending' });

			expect(response.status).toBe(401);
		});
	});

	describe('GET /guide/request-payment-link/:id', () => {
		it('should return payment link data when status is payment-pending', async () => {
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

			const mockCustomer = {
				id: 'cust_test123',
				name: 'Test Guide',
				contact: '+1234567890',
				email: 'test@example.com',
			};

			const mockOrder = {
				id: 'order_test123',
				amount: 500,
				currency: 'INR',
				reference_id: enrollment._id.toString(),
				status: 'created',
			};

			(RazorpayCustomers.createCustomer as jest.Mock).mockResolvedValue(mockCustomer);
			(RazorpayOrders.createOrder as jest.Mock).mockResolvedValue(mockOrder);

			const response = await request(app).get(`/guide/request-payment-link/${enrollment._id}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body).toHaveProperty('transaction_id');
			expect(response.body).toHaveProperty('razorpay_options');
			expect(response.body.razorpay_options.order_id).toBe('order_test123');
			expect(response.body.razorpay_options.amount).toBe(50000);

			// Verify transaction was created
			const transaction = await TransactionDB.findOne({
				reference_id: enrollment._id.toString(),
				reference_type: 'enrollment',
			});
			expect(transaction).toBeTruthy();
		});

		it('should return 404 if enrollment status is not payment-pending', async () => {
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

			const response = await request(app).get(`/guide/request-payment-link/${enrollment._id}`);

			expect(response.status).toBe(404);
		});
	});

	describe('POST /guide/confirm-payment/:id', () => {
		it('should confirm payment and create guide account', async () => {
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

			await TransactionDB.create({
				reference_id: enrollment._id.toString(),
				reference_type: 'enrollment',
				razorpay_order_id: 'order_test123',
				razorpay_customer_id: 'cust_test123',
				transaction_id: 'trans_test123',
				status: 'created',
				amount: 500,
				currency: 'INR',
			});

			(RazorpayOrders.getOrderStatus as jest.Mock).mockResolvedValue('paid');

			const response = await request(app)
				.post(`/guide/confirm-payment/${enrollment._id}`)
				.send({ transaction_id: 'trans_test123' });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.message).toContain('Payment confirmed successfully');

			// Verify enrollment status updated
			const updatedEnrollment = await GuideEnrollmentDB.findById(enrollment._id);
			expect(updatedEnrollment?.status).toBe('verified');

			// Verify guide account was created
			const account = await AccountDB.findOne({ email: 'test@example.com' });
			expect(account).toBeTruthy();
			expect(account?.role).toBe('guide');
			expect(account?.status).toBe('verified');

			// Verify credentials email was sent
			const { sendGuideCredentialsEmail } = require('@provider/email');
			expect(sendGuideCredentialsEmail).toHaveBeenCalled();
		});

		it('should return 404 if transaction not found', async () => {
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

			const response = await request(app)
				.post(`/guide/confirm-payment/${enrollment._id}`)
				.send({ transaction_id: 'invalid_transaction' });

			expect(response.status).toBe(404);
		});

		it('should return error if payment not completed', async () => {
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

			await TransactionDB.create({
				reference_id: enrollment._id.toString(),
				reference_type: 'enrollment',
				razorpay_order_id: 'order_test123',
				razorpay_customer_id: 'cust_test123',
				transaction_id: 'trans_test123',
				status: 'created',
				amount: 500,
				currency: 'INR',
			});

			(RazorpayOrders.getOrderStatus as jest.Mock).mockResolvedValue('created');

			const response = await request(app)
				.post(`/guide/confirm-payment/${enrollment._id}`)
				.send({ transaction_id: 'trans_test123' });

			expect(response.status).toBe(500);
		});
	});
});
