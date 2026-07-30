import AuthService from '@services/auth';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import configServer from '../../server/server-config';
import { testSignupData, testUser } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * A blog entry is a YouTube video plus a description, and optionally one
 * uploaded cover image. The video itself is never uploaded — the API takes a
 * `youtubeUrl`, stores the extracted 11-character video id, and derives the
 * thumbnail from it.
 */
describe('Blog API Integration Tests', () => {
	let app: express.Application;
	let adminToken: string;
	let userToken: string;
	const testUploadDir = path.join(__dirname, '../../static/misc');

	const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
	const YOUTUBE_ID = 'dQw4w9WgXcQ';

	const createImageBuffer = () =>
		Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
			'base64'
		);

	/** POST /blog as admin, as multipart (the route parses form-data). */
	const postBlog = (
		fields: Record<string, string>,
		image?: Buffer,
		token: string = adminToken
	) => {
		const req = request(app).post('/blog').set('Authorization', `Bearer ${token}`);
		Object.entries(fields).forEach(([key, value]) => req.field(key, value));
		if (image) req.attach('image', image, 'cover.jpg');
		return req;
	};

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);

		if (!fs.existsSync(testUploadDir)) {
			fs.mkdirSync(testUploadDir, { recursive: true });
		}
	});

	afterAll(async () => {
		await disconnectTestDB();
		if (fs.existsSync(testUploadDir)) {
			fs.readdirSync(testUploadDir).forEach((file) => {
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

		const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
		const adminResult = await AuthService.signup(adminData);
		adminToken = adminResult.accessToken;

		const userResult = await AuthService.signup(testUser);
		userToken = userResult.accessToken;
	});

	describe('POST /blog', () => {
		it('should successfully create a blog from a YouTube URL (admin)', async () => {
			const response = await postBlog({
				description: 'Test blog description',
				youtubeUrl: YOUTUBE_URL,
				hasImage: 'false',
			});

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.description).toBe('Test blog description');
			expect(response.body.hasImage).toBe(false);
			expect(response.body.videoId).toBe(YOUTUBE_ID);
			expect(response.body.thumbnailUrl).toBe(`https://img.youtube.com/vi/${YOUTUBE_ID}/0.jpg`);
			expect(response.body.imageFilename).toBeUndefined();
			expect(response.body).toHaveProperty('id');
			expect(response.body).not.toHaveProperty('_id');
		});

		it('should successfully create a blog with a cover image (admin)', async () => {
			const response = await postBlog(
				{
					description: 'Test blog with image',
					youtubeUrl: YOUTUBE_URL,
					hasImage: 'true',
				},
				createImageBuffer()
			);

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.description).toBe('Test blog with image');
			expect(response.body.hasImage).toBe(true);
			expect(response.body.videoId).toBe(YOUTUBE_ID);
			expect(response.body.imageFilename).toBeDefined();
			expect(response.body).toHaveProperty('id');
		});

		it('should accept a youtu.be short link', async () => {
			const response = await postBlog({
				description: 'Short link',
				youtubeUrl: `https://youtu.be/${YOUTUBE_ID}`,
				hasImage: 'false',
			});

			expect(response.status).toBe(201);
			expect(response.body.videoId).toBe(YOUTUBE_ID);
		});

		it('should accept a shorts link', async () => {
			const response = await postBlog({
				description: 'Shorts link',
				youtubeUrl: `https://youtube.com/shorts/${YOUTUBE_ID}`,
				hasImage: 'false',
			});

			expect(response.status).toBe(201);
			expect(response.body.videoId).toBe(YOUTUBE_ID);
		});

		it('should return 401 when user is not authenticated', async () => {
			const response = await request(app)
				.post('/blog')
				.field('description', 'Test blog')
				.field('youtubeUrl', YOUTUBE_URL)
				.field('hasImage', 'false');

			expect(response.status).toBe(401);
		});

		it('should return 403 when a non-admin tries to create a blog', async () => {
			// 403, not 401: the tourist is authenticated, they are just not allowed.
			const response = await postBlog(
				{ description: 'Test blog', youtubeUrl: YOUTUBE_URL, hasImage: 'false' },
				undefined,
				userToken
			);

			expect(response.status).toBe(403);
		});

		it('should return 400 when description is missing', async () => {
			const response = await postBlog({ youtubeUrl: YOUTUBE_URL, hasImage: 'false' });

			expect(response.status).toBe(400);
		});

		it('should return 400 when youtubeUrl is missing', async () => {
			const response = await postBlog({ description: 'Test blog', hasImage: 'false' });

			expect(response.status).toBe(400);
		});

		it('should return 400 when youtubeUrl is not a URL', async () => {
			const response = await postBlog({
				description: 'Test blog',
				youtubeUrl: 'not-a-url',
				hasImage: 'false',
			});

			expect(response.status).toBe(400);
		});

		it('should return 400 for a URL that is not a YouTube video', async () => {
			// Passes the validator's url() check, then fails id extraction.
			const response = await postBlog({
				description: 'Test blog',
				youtubeUrl: 'https://example.com/video',
				hasImage: 'false',
			});

			expect(response.status).toBe(400);
		});

		it('should return 400 when hasImage is true but no image is uploaded', async () => {
			const response = await postBlog({
				description: 'Test blog',
				youtubeUrl: YOUTUBE_URL,
				hasImage: 'true',
			});

			expect(response.status).toBe(400);
		});

		it('should return 400 when the uploaded image is not an allowed type', async () => {
			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Test blog')
				.field('youtubeUrl', YOUTUBE_URL)
				.field('hasImage', 'true')
				.attach('image', Buffer.from('This is a text file'), 'test.txt');

			expect(response.status).toBe(400);
		});
	});

	describe('GET /blog', () => {
		beforeEach(async () => {
			await postBlog({
				description: 'First blog',
				youtubeUrl: YOUTUBE_URL,
				hasImage: 'false',
			}).expect(201);

			await postBlog(
				{ description: 'Second blog', youtubeUrl: YOUTUBE_URL, hasImage: 'true' },
				createImageBuffer()
			).expect(201);
		});

		it('should get all blogs (public route)', async () => {
			const response = await request(app).get('/blog');

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.blogs).toBeInstanceOf(Array);
			expect(response.body.blogs.length).toBe(2);
			expect(response.body.blogs[0]).toHaveProperty('description');
			expect(response.body.blogs[0]).toHaveProperty('videoId');
			expect(response.body.blogs[0]).toHaveProperty('thumbnailUrl');
			expect(response.body.blogs[0]).toHaveProperty('id');
			expect(response.body.blogs[0]).not.toHaveProperty('_id');
		});

		it('should return blogs sorted by createdAt descending', async () => {
			const response = await request(app).get('/blog');

			expect(response.status).toBe(200);
			expect(response.body.blogs.length).toBeGreaterThan(1);
			const firstDate = new Date(response.body.blogs[0].createdAt);
			const secondDate = new Date(response.body.blogs[1].createdAt);
			expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
		});
	});

	describe('GET /blog/:id', () => {
		let blogId: string;

		beforeEach(async () => {
			const response = await postBlog(
				{
					description: 'Test blog for get by id',
					youtubeUrl: YOUTUBE_URL,
					hasImage: 'true',
				},
				createImageBuffer()
			).expect(201);

			blogId = response.body.id;
		});

		it('should get a single blog by id (public route)', async () => {
			const response = await request(app).get(`/blog/${blogId}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.id).toBe(blogId);
			expect(response.body.description).toBe('Test blog for get by id');
			expect(response.body.hasImage).toBe(true);
			expect(response.body.videoId).toBe(YOUTUBE_ID);
			expect(response.body).not.toHaveProperty('_id');
		});

		it('should return 400 for invalid blog id format', async () => {
			const response = await request(app).get('/blog/invalid-id');

			expect(response.status).toBe(400);
		});

		it('should return 404 for non-existent blog id', async () => {
			const fakeId = '507f1f77bcf86cd799439011';
			const response = await request(app).get(`/blog/${fakeId}`);

			expect(response.status).toBe(404);
		});
	});

	describe('DELETE /blog/:id', () => {
		let blogId: string;

		beforeEach(async () => {
			const response = await postBlog({
				description: 'Blog to delete',
				youtubeUrl: YOUTUBE_URL,
				hasImage: 'false',
			}).expect(201);

			blogId = response.body.id;
		});

		it('should delete a blog (admin)', async () => {
			const response = await request(app)
				.delete(`/blog/${blogId}`)
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);

			await request(app).get(`/blog/${blogId}`).expect(404);
		});

		it('should return 403 when a non-admin tries to delete', async () => {
			const response = await request(app)
				.delete(`/blog/${blogId}`)
				.set('Authorization', `Bearer ${userToken}`);

			expect(response.status).toBe(403);
		});

		it('should return 401 when unauthenticated', async () => {
			const response = await request(app).delete(`/blog/${blogId}`);

			expect(response.status).toBe(401);
		});
	});
});
