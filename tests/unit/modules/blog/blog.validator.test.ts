import { BadRequestError } from 'node-be-utilities';
import { CreateBlogValidator } from '../../../../server/modules/blog/blog.validator';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
} from '../../../helpers/testHelpers';

// A blog post is a YouTube video plus a description, so youtubeUrl is required by
// the validator (and by the create form). Every "should pass" case therefore has
// to supply a valid one.
const VALID_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

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
				youtubeUrl: VALID_YOUTUBE_URL,
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data).toBeDefined();
			expect(mockRequest.locals?.data.description).toBe('This is a test blog description');
			expect(mockRequest.locals?.data.youtubeUrl).toBe(VALID_YOUTUBE_URL);
			expect(mockRequest.locals?.data.hasImage).toBe(false);
		});

		it('should pass validation with hasImage true', async () => {
			mockRequest.body = {
				description: 'Blog with image',
				youtubeUrl: VALID_YOUTUBE_URL,
				hasImage: true,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.hasImage).toBe(true);
		});

		it('should default hasImage to false when not provided', async () => {
			mockRequest.body = {
				description: 'Blog without hasImage field',
				youtubeUrl: VALID_YOUTUBE_URL,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.hasImage).toBe(false);
		});

		it('should trim description whitespace', async () => {
			mockRequest.body = {
				description: '  Trimmed description  ',
				youtubeUrl: VALID_YOUTUBE_URL,
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.description).toBe('Trimmed description');
		});

		it('should return 400 when youtubeUrl is missing', async () => {
			mockRequest.body = {
				description: 'A blog with no video link',
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledTimes(1);
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('youtubeUrl');
		});

		it('should return 400 when youtubeUrl is not a valid URL', async () => {
			mockRequest.body = {
				description: 'A blog with a bad video link',
				youtubeUrl: 'not-a-url',
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledTimes(1);
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('youtubeUrl');
		});

		it('should return 400 when description is missing', async () => {
			mockRequest.body = {
				youtubeUrl: VALID_YOUTUBE_URL,
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
				youtubeUrl: VALID_YOUTUBE_URL,
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
				youtubeUrl: VALID_YOUTUBE_URL,
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledTimes(1);
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeDefined();
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('description');
		});

		it('should convert string "true" to boolean true for hasImage', async () => {
			mockRequest.body = {
				description: 'Valid description',
				youtubeUrl: VALID_YOUTUBE_URL,
				hasImage: 'true', // String 'true' should be converted to boolean
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.hasImage).toBe(true);
		});

		it('should convert string "false" to boolean false for hasImage', async () => {
			mockRequest.body = {
				description: 'Valid description',
				youtubeUrl: VALID_YOUTUBE_URL,
				hasImage: 'false', // String 'false' should be converted to boolean
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.hasImage).toBe(false);
		});

		it('should return 400 when hasImage is an invalid string', async () => {
			mockRequest.body = {
				description: 'Valid description',
				youtubeUrl: VALID_YOUTUBE_URL,
				hasImage: 'yes', // Invalid string that cannot be converted to boolean
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledTimes(1);
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeDefined();
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('hasImage');
		});

		it('should return 400 when hasImage is null', async () => {
			mockRequest.body = {
				description: 'Valid description',
				youtubeUrl: VALID_YOUTUBE_URL,
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
				youtubeUrl: VALID_YOUTUBE_URL,
				hasImage: false,
			};

			await CreateBlogValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.description).toBe(longDescription);
		});
	});
});
