import { BadRequestError } from 'node-be-utilities';
import {
	ConfirmPaymentValidator,
	EnrollValidator,
	UpdateStatusValidator,
} from '../../../../src/modules/guide/guide.validator';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
} from '../../../helpers/testHelpers';

describe('Guide Validators', () => {
	describe('EnrollValidator', () => {
		it('should pass validation with valid data', async () => {
			const mockRequest = createMockRequest({
				body: {
					name: 'John Doe',
					email: 'john@example.com',
					phone: '+1234567890',
					city: 'Mumbai',
					type: 'normal',
					pan: 'ABCDE1234F',
					languages: JSON.stringify(['English', 'Hindi']),
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await EnrollValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data).toBeDefined();
			expect(mockRequest.locals.data.name).toBe('John Doe');
			expect(mockRequest.locals.data.type).toBe('normal');
			expect(mockRequest.locals.data.languages).toEqual(['English', 'Hindi']);
		});

		it('should pass validation with languages as comma-separated string', async () => {
			const mockRequest = createMockRequest({
				body: {
					name: 'John Doe',
					email: 'john@example.com',
					phone: '+1234567890',
					city: 'Mumbai',
					type: 'normal',
					pan: 'ABCDE1234F',
					languages: 'English,Hindi,Marathi',
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await EnrollValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
			expect(Array.isArray(mockRequest.locals.data.languages)).toBe(true);
		});

		it('should fail validation if name is missing', async () => {
			const mockRequest = createMockRequest({
				body: {
					email: 'john@example.com',
					phone: '+1234567890',
					city: 'Mumbai',
					type: 'normal',
					pan: 'ABCDE1234F',
					languages: ['English'],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await EnrollValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if email is invalid', async () => {
			const mockRequest = createMockRequest({
				body: {
					name: 'John Doe',
					email: 'invalid-email',
					phone: '+1234567890',
					city: 'Mumbai',
					type: 'normal',
					pan: 'ABCDE1234F',
					languages: ['English'],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await EnrollValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if type is invalid', async () => {
			const mockRequest = createMockRequest({
				body: {
					name: 'John Doe',
					email: 'john@example.com',
					phone: '+1234567890',
					city: 'Mumbai',
					type: 'invalid-type',
					pan: 'ABCDE1234F',
					languages: ['English'],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await EnrollValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if languages array is empty', async () => {
			const mockRequest = createMockRequest({
				body: {
					name: 'John Doe',
					email: 'john@example.com',
					phone: '+1234567890',
					city: 'Mumbai',
					type: 'normal',
					pan: 'ABCDE1234F',
					languages: [],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await EnrollValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should accept escort type', async () => {
			const mockRequest = createMockRequest({
				body: {
					name: 'John Doe',
					email: 'john@example.com',
					phone: '+1234567890',
					city: 'Mumbai',
					type: 'escort',
					pan: 'ABCDE1234F',
					languages: ['English'],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await EnrollValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data.type).toBe('escort');
		});
	});

	describe('UpdateStatusValidator', () => {
		it('should pass validation with valid status', async () => {
			const mockRequest = createMockRequest({
				body: {
					status: 'payment-pending',
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await UpdateStatusValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data.status).toBe('payment-pending');
		});

		it('should accept all valid status values', async () => {
			const validStatuses = ['unverified', 'payment-pending', 'verified'];

			for (const status of validStatuses) {
				const mockRequest = createMockRequest({
					body: { status },
				}) as any;

				const mockResponse = createMockResponse();
				const mockNext = createMockNext();

				await UpdateStatusValidator(mockRequest, mockResponse as any, mockNext);

				expect(mockNext).toHaveBeenCalledWith();
				expect(mockRequest.locals.data.status).toBe(status);
			}
		});

		it('should fail validation with invalid status', async () => {
			const mockRequest = createMockRequest({
				body: {
					status: 'invalid-status',
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await UpdateStatusValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if status is missing', async () => {
			const mockRequest = createMockRequest({
				body: {},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await UpdateStatusValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});
	});

	describe('ConfirmPaymentValidator', () => {
		it('should pass validation with valid transaction_id', async () => {
			const mockRequest = createMockRequest({
				body: {
					transaction_id: 'trans_1234567890',
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await ConfirmPaymentValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data.transaction_id).toBe('trans_1234567890');
		});

		it('should fail validation if transaction_id is missing', async () => {
			const mockRequest = createMockRequest({
				body: {},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await ConfirmPaymentValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if transaction_id is empty string', async () => {
			const mockRequest = createMockRequest({
				body: {
					transaction_id: '',
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await ConfirmPaymentValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should trim whitespace from transaction_id', async () => {
			const mockRequest = createMockRequest({
				body: {
					transaction_id: '  trans_123  ',
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await ConfirmPaymentValidator(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data.transaction_id).toBe('trans_123');
		});
	});
});
