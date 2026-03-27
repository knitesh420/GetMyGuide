import { Types } from 'mongoose';
import { BadRequestError } from 'node-be-utilities';
import Controller from '../../../../src/modules/guide/guide.controller';
import {
	createMockFile,
	createMockNext,
	createMockRequest,
	createMockResponse,
	createMockUser,
} from '../../../helpers/testHelpers';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../../setup/db.setup';

// Mock GuideService
jest.mock('@services/guide', () => ({
	__esModule: true,
	default: {
		enroll: jest.fn(),
		getAllEnrollments: jest.fn(),
		getEnrollmentById: jest.fn(),
		updateEnrollmentStatus: jest.fn(),
		requestPaymentLink: jest.fn(),
		confirmPayment: jest.fn(),
	},
}));

import GuideService from '@services/guide';

describe('Guide Controller', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();
	});

	describe('enroll', () => {
		it('should successfully create enrollment with valid files', async () => {
			const mockRequest = createMockRequest({
				locals: {
					data: {
						name: 'John Doe',
						email: 'john@example.com',
						phone: '+1234567890',
						city: 'Mumbai',
						type: 'normal',
						pan: 'ABCDE1234F',
						languages: ['English', 'Hindi'],
					},
				},
				files: {
					licence: [
						createMockFile({
							fieldname: 'licence',
							filename: 'licence.pdf',
							mimetype: 'application/pdf',
						}),
					],
					aadhar: [
						createMockFile({
							fieldname: 'aadhar',
							filename: 'aadhar.pdf',
							mimetype: 'application/pdf',
						}),
					],
					photo: [
						createMockFile({
							fieldname: 'photo',
							filename: 'photo.jpg',
							mimetype: 'image/jpeg',
						}),
					],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			(GuideService.enroll as jest.Mock).mockResolvedValue({
				message: 'Enrollment submitted successfully. Your application is under review.',
			});

			await Controller.enroll(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(GuideService.enroll).toHaveBeenCalledWith({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '+1234567890',
				city: 'Mumbai',
				type: 'normal',
				pan: 'ABCDE1234F',
				languages: ['English', 'Hindi'],
				licence: 'licence.pdf',
				aadhar: 'aadhar.pdf',
				photo: 'photo.jpg',
			});
		});

		it('should return BadRequestError if licence file is missing', async () => {
			const mockRequest = createMockRequest({
				locals: {
					data: {
						name: 'John Doe',
						email: 'john@example.com',
						phone: '+1234567890',
						city: 'Mumbai',
						type: 'normal',
						pan: 'ABCDE1234F',
						languages: ['English'],
					},
				},
				files: {
					aadhar: [
						createMockFile({
							fieldname: 'aadhar',
							filename: 'aadhar.pdf',
							mimetype: 'application/pdf',
						}),
					],
					photo: [
						createMockFile({
							fieldname: 'photo',
							filename: 'photo.jpg',
							mimetype: 'image/jpeg',
						}),
					],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.enroll(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should return BadRequestError if aadhar file is missing', async () => {
			const mockRequest = createMockRequest({
				locals: {
					data: {
						name: 'John Doe',
						email: 'john@example.com',
						phone: '+1234567890',
						city: 'Mumbai',
						type: 'normal',
						pan: 'ABCDE1234F',
						languages: ['English'],
					},
				},
				files: {
					licence: [
						createMockFile({
							fieldname: 'licence',
							filename: 'licence.pdf',
							mimetype: 'application/pdf',
						}),
					],
					photo: [
						createMockFile({
							fieldname: 'photo',
							filename: 'photo.jpg',
							mimetype: 'image/jpeg',
						}),
					],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.enroll(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should return BadRequestError if photo file is missing', async () => {
			const mockRequest = createMockRequest({
				locals: {
					data: {
						name: 'John Doe',
						email: 'john@example.com',
						phone: '+1234567890',
						city: 'Mumbai',
						type: 'normal',
						pan: 'ABCDE1234F',
						languages: ['English'],
					},
				},
				files: {
					licence: [
						createMockFile({
							fieldname: 'licence',
							filename: 'licence.pdf',
							mimetype: 'application/pdf',
						}),
					],
					aadhar: [
						createMockFile({
							fieldname: 'aadhar',
							filename: 'aadhar.pdf',
							mimetype: 'application/pdf',
						}),
					],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.enroll(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should return BadRequestError if licence is not PDF', async () => {
			const mockRequest = createMockRequest({
				locals: {
					data: {
						name: 'John Doe',
						email: 'john@example.com',
						phone: '+1234567890',
						city: 'Mumbai',
						type: 'normal',
						pan: 'ABCDE1234F',
						languages: ['English'],
					},
				},
				files: {
					licence: [
						createMockFile({
							fieldname: 'licence',
							filename: 'licence.jpg',
							mimetype: 'image/jpeg',
						}),
					],
					aadhar: [
						createMockFile({
							fieldname: 'aadhar',
							filename: 'aadhar.pdf',
							mimetype: 'application/pdf',
						}),
					],
					photo: [
						createMockFile({
							fieldname: 'photo',
							filename: 'photo.jpg',
							mimetype: 'image/jpeg',
						}),
					],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.enroll(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});
	});

	describe('listAll', () => {
		it('should return all enrollments', async () => {
			const mockUser = createMockUser({ role: 'admin' });
			const mockRequest = createMockRequest({
				locals: {
					user: mockUser,
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			const mockEnrollments = [
				{
					id: '123',
					name: 'Guide 1',
					email: 'guide1@example.com',
					status: 'unverified',
				},
				{
					id: '456',
					name: 'Guide 2',
					email: 'guide2@example.com',
					status: 'payment-pending',
				},
			];

			(GuideService.getAllEnrollments as jest.Mock).mockResolvedValue(mockEnrollments);

			await Controller.listAll(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(GuideService.getAllEnrollments).toHaveBeenCalled();
		});
	});

	describe('getEnrollStatus', () => {
		it('should return enrollment status', async () => {
			const enrollmentId = new Types.ObjectId();
			const mockRequest = createMockRequest({
				locals: {
					id: enrollmentId,
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			const mockEnrollment = {
				id: enrollmentId.toString(),
				name: 'Test Guide',
				email: 'test@example.com',
				status: 'payment-pending',
			};

			(GuideService.getEnrollmentById as jest.Mock).mockResolvedValue(mockEnrollment);

			await Controller.getEnrollStatus(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(GuideService.getEnrollmentById).toHaveBeenCalledWith(enrollmentId);
		});
	});

	describe('updateEnrollStatus', () => {
		it('should update enrollment status', async () => {
			const mockUser = createMockUser({ role: 'admin' });
			const enrollmentId = new Types.ObjectId();
			const mockRequest = createMockRequest({
				locals: {
					user: mockUser,
					id: enrollmentId,
					data: {
						status: 'payment-pending',
					},
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			const mockEnrollment = {
				id: enrollmentId.toString(),
				status: 'payment-pending',
			};

			(GuideService.updateEnrollmentStatus as jest.Mock).mockResolvedValue(mockEnrollment);

			await Controller.updateEnrollStatus(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(GuideService.updateEnrollmentStatus).toHaveBeenCalledWith(
				enrollmentId,
				'payment-pending'
			);
		});
	});

	describe('requestPaymentLink', () => {
		it('should return payment link data', async () => {
			const enrollmentId = new Types.ObjectId();
			const mockRequest = createMockRequest({
				locals: {
					id: enrollmentId,
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			const mockPaymentData = {
				data: {
					transaction_id: 'trans123',
					razorpay_options: {
						order_id: 'order123',
						amount: 50000,
					},
				},
			};

			(GuideService.requestPaymentLink as jest.Mock).mockResolvedValue(mockPaymentData);

			await Controller.requestPaymentLink(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(GuideService.requestPaymentLink).toHaveBeenCalledWith(enrollmentId);
		});
	});

	describe('confirmPayment', () => {
		it('should confirm payment and return success message', async () => {
			const enrollmentId = new Types.ObjectId();
			const mockRequest = createMockRequest({
				locals: {
					id: enrollmentId,
					data: {
						transaction_id: 'trans123',
					},
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			const mockResult = {
				message: 'Payment confirmed successfully.',
			};

			(GuideService.confirmPayment as jest.Mock).mockResolvedValue(mockResult);

			await Controller.confirmPayment(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(GuideService.confirmPayment).toHaveBeenCalledWith(enrollmentId, 'trans123');
		});
	});
});
