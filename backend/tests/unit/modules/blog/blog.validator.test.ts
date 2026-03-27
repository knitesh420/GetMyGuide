import { BadRequestError } from 'node-be-utilities';
import { CreateBlogValidator } from '../../../../src/modules/blog/blog.validator';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
} from '../../../helpers/testHelpers';

describe('Blog Validator', () => {
	let mockRequest: any;
	let mockResponse: any;
	let mockNext: ReturnType<typeof createMockNext>;

	beforeEach(() => {
		mockRequest = createMockRequest();
		mockResponse = createMockResponse();
		mockNext = createMockNext();
	});

	describe('CreateBlogValidator', () => {
		it('should pass validation with valid data', async () => {
			mockRequest.body = {
				description: 'This is a test blog description',
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data).toBeDefined();
			expect(mockRequest.locals?.data.description).toBe('This is a test blog description');
			expect(mockRequest.locals?.data.hasImage).toBe(false);
		});

		it('should pass validation with hasImage true', async () => {
			mockRequest.body = {
				description: 'Blog with image',
				hasImage: true,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.hasImage).toBe(true);
		});

		it('should default hasImage to false when not provided', async () => {
			mockRequest.body = {
				description: 'Blog without hasImage field',
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.hasImage).toBe(false);
		});

		it('should trim description whitespace', async () => {
			mockRequest.body = {
				description: '  Trimmed description  ',
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.description).toBe('Trimmed description');
		});

		it('should return 400 when description is missing', async () => {
			mockRequest.body = {
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('description');
		});

		it('should return 400 when description is empty string', async () => {
			mockRequest.body = {
				description: '',
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
		});

		it('should return 400 when description is only whitespace', async () => {
			mockRequest.body = {
				description: '   ',
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			// Check that next was called with an error (not without arguments)
			expect(mockNext).toHaveBeenCalledTimes(1);
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeDefined();
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('description');
		});

		it('should convert string "true" to boolean true for hasImage', async () => {
			mockRequest.body = {
				description: 'Valid description',
				hasImage: 'true', // String 'true' should be converted to boolean
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.hasImage).toBe(true);
		});

		it('should convert string "false" to boolean false for hasImage', async () => {
			mockRequest.body = {
				description: 'Valid description',
				hasImage: 'false', // String 'false' should be converted to boolean
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.hasImage).toBe(false);
		});

		it('should return 400 when hasImage is an invalid string', async () => {
			mockRequest.body = {
				description: 'Valid description',
				hasImage: 'yes', // Invalid string that cannot be converted to boolean
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			// Check that next was called with an error (not without arguments)
			expect(mockNext).toHaveBeenCalledTimes(1);
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeDefined();
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('hasImage');
		});

		it('should return 400 when hasImage is null', async () => {
			mockRequest.body = {
				description: 'Valid description',
				hasImage: null,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
		});

		it('should handle long descriptions', async () => {
			const longDescription = 'A'.repeat(10000);
			mockRequest.body = {
				description: longDescription,
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.description).toBe(longDescription);
		});
	});
});
