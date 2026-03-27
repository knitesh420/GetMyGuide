import { BlogDB } from '@mongo';
import BlogService from '@services/blog';
import { Types } from 'mongoose';
import { NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

describe('BlogService', () => {
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
		it('should create a blog and transform _id to id', async () => {
			const blogData = {
				videoFilename: 'test-video.mp4',
				description: 'Test blog description',
				hasImage: false,
			};

			const result = await BlogService.createBlog(blogData);

			expect(result).toHaveProperty('id');
			expect(result).not.toHaveProperty('_id');
			expect(result.videoFilename).toBe(blogData.videoFilename);
			expect(result.description).toBe(blogData.description);
			expect(result.hasImage).toBe(false);
			expect(typeof result.id).toBe('string');
		});

		it('should create a blog with image and transform correctly', async () => {
			const blogData = {
				videoFilename: 'test-video.mp4',
				description: 'Test blog with image',
				hasImage: true,
				imageFilename: 'test-image.jpg',
			};

			const result = await BlogService.createBlog(blogData);

			expect(result).toHaveProperty('id');
			expect(result.hasImage).toBe(true);
			expect(result.imageFilename).toBe('test-image.jpg');
		});
	});

	describe('getAllBlogs', () => {
		it('should return all blogs with transformed _id to id', async () => {
			// Create multiple blogs
			await BlogDB.create({
				videoFilename: 'video1.mp4',
				description: 'First blog',
				hasImage: false,
			});

			await BlogDB.create({
				videoFilename: 'video2.mp4',
				description: 'Second blog',
				hasImage: true,
				imageFilename: 'image2.jpg',
			});

			const results = await BlogService.getAllBlogs();

			expect(results).toHaveLength(2);
			results.forEach((blog) => {
				expect(blog).toHaveProperty('id');
				expect(blog).not.toHaveProperty('_id');
				expect(typeof blog.id).toBe('string');
			});
		});

		it('should return blogs sorted by createdAt descending', async () => {
			// Create blogs with delay to ensure different timestamps
			await BlogDB.create({
				videoFilename: 'video1.mp4',
				description: 'First blog',
				hasImage: false,
			});

			await new Promise((resolve) => setTimeout(resolve, 10));

			await BlogDB.create({
				videoFilename: 'video2.mp4',
				description: 'Second blog',
				hasImage: false,
			});

			const results = await BlogService.getAllBlogs();

			expect(results.length).toBeGreaterThan(1);
			// Most recent should be first
			const firstDate = new Date(results[0].createdAt);
			const secondDate = new Date(results[1].createdAt);
			expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
		});

		it('should return empty array when no blogs exist', async () => {
			const results = await BlogService.getAllBlogs();

			expect(results).toEqual([]);
		});
	});

	describe('getBlogById', () => {
		it('should return a blog by id with transformed _id to id', async () => {
			const blog = await BlogDB.create({
				videoFilename: 'test-video.mp4',
				description: 'Test blog',
				hasImage: false,
			});

			const result = await BlogService.getBlogById(blog._id);

			expect(result).toHaveProperty('id');
			expect(result).not.toHaveProperty('_id');
			expect(result.id).toBe(blog._id.toString());
			expect(result.description).toBe('Test blog');
		});

		it('should throw NotFoundError when blog does not exist', async () => {
			const fakeId = new Types.ObjectId();

			await expect(BlogService.getBlogById(fakeId)).rejects.toThrow(NotFoundError);
		});

		it('should handle blog with image correctly', async () => {
			const blog = await BlogDB.create({
				videoFilename: 'test-video.mp4',
				description: 'Test blog with image',
				hasImage: true,
				imageFilename: 'test-image.jpg',
			});

			const result = await BlogService.getBlogById(blog._id);

			expect(result.hasImage).toBe(true);
			expect(result.imageFilename).toBe('test-image.jpg');
		});
	});
});
