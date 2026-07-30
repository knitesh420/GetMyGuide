import { BlogDB } from '@mongo';
import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from 'node-be-utilities';
import Controller from '../../../../src/modules/blog/blog.controller';
import {
	createMockFile,
	createMockNext,
	createMockRequest,
	createMockResponse,
	createMockUser,
} from '../../../helpers/testHelpers';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../../setup/db.setup';

describe('Blog Controller', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	describe('createBlog', () => {
		it('should successfully create a blog with YouTube URL only', async () => {
			const mockUser = createMockUser({ role: 'admin' });

			const mockRequest = createMockRequest({
				locals: {
					data: {
						description: 'Test blog description',
						youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
						hasImage: false,
					},
					user: mockUser,
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.createBlog(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalled();

			const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
			expect(responseData.success).toBe(true);
			expect(responseData).toHaveProperty('id');
			expect(responseData).not.toHaveProperty('_id');
			expect(responseData.description).toBe('Test blog description');
			expect(responseData.hasImage).toBe(false);
			expect(responseData.videoId).toBe('dQw4w9WgXcQ');
			expect(responseData.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg');
		});

		it('should successfully create a blog with YouTube URL and image', async () => {
			const mockUser = createMockUser({ role: 'admin' });
			const imageFile = createMockFile({
				fieldname: 'image',
				filename: 'test-image.jpg',
				mimetype: 'image/jpeg',
			});

			const mockRequest = createMockRequest({
				locals: {
					data: {
						description: 'Test blog with image',
						youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
						hasImage: true,
					},
					user: mockUser,
				},
				files: {
					image: [imageFile],
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.createBlog(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(201);

			const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
			expect(responseData).toHaveProperty('id');
			expect(responseData).not.toHaveProperty('_id');
			expect(responseData.hasImage).toBe(true);
			expect(responseData.imageFilename).toBe('test-image.jpg');
		});

		it('should return 400 when YouTube URL is invalid', async () => {
			const mockUser = createMockUser({ role: 'admin' });
			const mockRequest = createMockRequest({
				locals: {
					data: {
						description: 'Test blog',
						youtubeUrl: 'https://example.com/not-youtube',
						hasImage: false,
					},
					user: mockUser,
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.createBlog(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('Invalid YouTube URL');
		});

		it('should return 400 when hasImage is true but image is missing', async () => {
			const mockUser = createMockUser({ role: 'admin' });

			const mockRequest = createMockRequest({
				locals: {
					data: {
						description: 'Test blog',
						youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
						hasImage: true,
					},
					user: mockUser,
				},
				files: {},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.createBlog(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toContain('Image file is required');
		});
	});

	describe('getBlogs', () => {
		it('should return all blogs', async () => {
			await BlogDB.create([
				{
					videoId: 'abc123def45',
					description: 'First blog',
					hasImage: false,
				},
				{
					videoId: 'xyz789ghi01',
					description: 'Second blog',
					hasImage: true,
					imageFilename: 'image2.jpg',
				},
			]);

			const mockRequest = createMockRequest() as any;
			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.getBlogs(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);

			const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
			expect(responseData.success).toBe(true);
			expect(responseData).toBeDefined();
			expect(responseData.blogs).toBeInstanceOf(Array);
			expect(responseData.blogs.length).toBe(2);
		});

		it('should return empty array when no blogs exist', async () => {
			const mockRequest = createMockRequest() as any;
			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.getBlogs(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
			expect(responseData.blogs).toEqual([]);
		});
	});

	describe('getBlogById', () => {
		it('should return a blog by id', async () => {
			const blog = await BlogDB.create({
				videoId: 'dQw4w9WgXcQ',
				description: 'Test blog',
				hasImage: false,
			});

			const mockRequest = createMockRequest({
				locals: {
					id: blog._id,
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.getBlogById(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);

			const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
			expect(responseData.success).toBe(true);
			expect(responseData.id).toBe(blog._id.toString());
			expect(responseData).not.toHaveProperty('_id');
			expect(responseData.description).toBe('Test blog');
		});

		it('should return 404 when blog does not exist', async () => {
			const fakeId = new Types.ObjectId();
			const mockRequest = createMockRequest({
				locals: {
					id: fakeId,
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			await Controller.getBlogById(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).toHaveBeenCalled();
			const error = (mockNext as jest.Mock).mock.calls[0][0];
			expect(error).toBeInstanceOf(NotFoundError);
			expect(error.message).toBe('Blog not found');
		});
	});
});
