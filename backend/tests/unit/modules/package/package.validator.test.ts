import { BadRequestError } from 'node-be-utilities';
import {
	CreatePackageValidator,
	UpdatePackageValidator,
	UpdateStatusValidator,
} from '../../../../src/modules/package/package.validator';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
} from '../../../helpers/testHelpers';

describe('Package Validator', () => {
	let mockRequest: any;
	let mockResponse: any;
	let mockNext: ReturnType<typeof createMockNext>;

	beforeEach(() => {
		mockRequest = createMockRequest();
		mockResponse = createMockResponse();
		mockNext = createMockNext();
	});

	describe('CreatePackageValidator', () => {
		it('should pass validation with valid data', async () => {
			mockRequest.body = {
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Taj Mahal', 'Red Fort'],
				price: 5000,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data).toBeDefined();
			expect(mockRequest.locals?.data.title).toBe('Test Package');
			expect(mockRequest.locals?.data.city).toBe('Mumbai');
			expect(mockRequest.locals?.data.places).toEqual(['Taj Mahal', 'Red Fort']);
			expect(mockRequest.locals?.data.price).toBe(5000);
			expect(mockRequest.locals?.data.featured).toBe(false);
		});

		it('should pass validation with all optional fields', async () => {
			mockRequest.body = {
				title: 'Premium Package',
				city: 'Delhi',
				places: ['India Gate'],
				price: 10000,
				shortDescription: 'A premium tour',
				description: 'Detailed description',
				inclusions: ['Breakfast', 'Lunch'],
				exclusions: ['Dinner'],
				featured: true,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.shortDescription).toBe('A premium tour');
			expect(mockRequest.locals?.data.description).toBe('Detailed description');
			expect(mockRequest.locals?.data.inclusions).toEqual(['Breakfast', 'Lunch']);
			expect(mockRequest.locals?.data.exclusions).toEqual(['Dinner']);
			expect(mockRequest.locals?.data.featured).toBe(true);
		});

		it('should parse places from comma-separated string', async () => {
			mockRequest.body = {
				title: 'Test Package',
				city: 'Mumbai',
				places: 'Place1, Place2, Place3',
				price: 5000,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.places).toEqual(['Place1', 'Place2', 'Place3']);
		});

		it('should parse places from JSON string', async () => {
			mockRequest.body = {
				title: 'Test Package',
				city: 'Mumbai',
				places: JSON.stringify(['Place1', 'Place2']),
				price: 5000,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.places).toEqual(['Place1', 'Place2']);
		});

		it('should parse price from string', async () => {
			mockRequest.body = {
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place1'],
				price: '5000',
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.price).toBe(5000);
		});

		it('should return 400 when title is missing', async () => {
			mockRequest.body = {
				city: 'Mumbai',
				places: ['Place1'],
				price: 5000,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('title');
		});

		it('should return 400 when city is missing', async () => {
			mockRequest.body = {
				title: 'Test Package',
				places: ['Place1'],
				price: 5000,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('city');
		});

		it('should return 400 when places is missing', async () => {
			mockRequest.body = {
				title: 'Test Package',
				city: 'Mumbai',
				price: 5000,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('places');
		});

		it('should return 400 when price is missing', async () => {
			mockRequest.body = {
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place1'],
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('price');
		});

		it('should return 400 when price is negative', async () => {
			mockRequest.body = {
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place1'],
				price: -100,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
		});

		it('should trim whitespace from string fields', async () => {
			mockRequest.body = {
				title: '  Test Package  ',
				city: '  Mumbai  ',
				places: ['Place1'],
				price: 5000,
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.title).toBe('Test Package');
			expect(mockRequest.locals?.data.city).toBe('Mumbai');
		});

		it('should convert string "true" to boolean for featured', async () => {
			mockRequest.body = {
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place1'],
				price: 5000,
				featured: 'true',
			};

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.featured).toBe(true);
		});
	});

	describe('UpdatePackageValidator', () => {
		it('should pass validation with partial update data', async () => {
			mockRequest.body = {
				title: 'Updated Title',
				price: 6000,
			};

			await UpdatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.title).toBe('Updated Title');
			expect(mockRequest.locals?.data.price).toBe(6000);
		});

		it('should pass validation with empty body (all fields optional)', async () => {
			mockRequest.body = {};

			await UpdatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should return 400 when title is empty string', async () => {
			mockRequest.body = {
				title: '',
			};

			await UpdatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
		});

		it('should return 400 when price is negative', async () => {
			mockRequest.body = {
				price: -100,
			};

			await UpdatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
		});
	});

	describe('UpdateStatusValidator', () => {
		it('should pass validation with active status', async () => {
			mockRequest.body = {
				status: 'active',
			};

			await UpdateStatusValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.status).toBe('active');
		});

		it('should pass validation with inactive status', async () => {
			mockRequest.body = {
				status: 'inactive',
			};

			await UpdateStatusValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.status).toBe('inactive');
		});

		it('should return 400 when status is missing', async () => {
			mockRequest.body = {};

			await UpdateStatusValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('status');
		});

		it('should return 400 when status is invalid', async () => {
			mockRequest.body = {
				status: 'invalid',
			};

			await UpdateStatusValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('status');
		});
	});
});
