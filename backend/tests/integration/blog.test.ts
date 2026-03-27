import AuthService from '@services/auth';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import configServer from '../../src/server-config';
import { testSignupData, testUser } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

describe('Blog API Integration Tests', () => {
	let app: express.Application;
	let adminToken: string;
	let userToken: string;
	const testUploadDir = path.join(__dirname, '../../static/misc');

	// Create test video buffer (minimal valid MP4 header)
	const createVideoBuffer = () => {
		// Minimal MP4 file header
		return Buffer.from([
			0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02,
			0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32, 0x61, 0x76, 0x63, 0x31, 0x6d, 0x70,
			0x34, 0x31,
		]);
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

		// Create regular user
		const userResult = await AuthService.signup(testUser);
		userToken = userResult.token;
	});

	afterAll(async () => {
		await disconnectTestDB();
		// Clean up test files
		if (fs.existsSync(testUploadDir)) {
			const files = fs.readdirSync(testUploadDir);
			files.forEach((file) => {
				try {
					fs.unlinkSync(path.join(testUploadDir, file));
				} catch (error) {
					// Ignore errors during cleanup
				}
			});
		}
	});

	beforeEach(async () => {
		await clearDatabase();

		// Recreate admin and user after clearing database
		const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
		const adminResult = await AuthService.signup(adminData);
		adminToken = adminResult.token;

		const userResult = await AuthService.signup(testUser);
		userToken = userResult.token;
	});

	describe('POST /blog', () => {
		it('should successfully create a blog with video only (admin)', async () => {
			const videoBuffer = createVideoBuffer();

			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Test blog description')
				.field('hasImage', 'false')
				.attach('video', videoBuffer, 'test-video.mp4');

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body).toBeDefined();
			expect(response.body.description).toBe('Test blog description');
			expect(response.body.hasImage).toBe(false);
			expect(response.body.videoFilename).toBeDefined();
			expect(response.body.imageFilename).toBeUndefined();
			expect(response.body).toHaveProperty('id');
			expect(response.body).not.toHaveProperty('_id');
		});

		it('should successfully create a blog with video and image (admin)', async () => {
			const videoBuffer = createVideoBuffer();
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Test blog with image')
				.field('hasImage', 'true')
				.attach('video', videoBuffer, 'test-video.mp4')
				.attach('image', imageBuffer, 'test-image.jpg');

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body).toBeDefined();
			expect(response.body.description).toBe('Test blog with image');
			expect(response.body.hasImage).toBe(true);
			expect(response.body.videoFilename).toBeDefined();
			expect(response.body.imageFilename).toBeDefined();
			expect(response.body).toHaveProperty('id');
			expect(response.body).not.toHaveProperty('_id');
		});

		it('should return 401 when user is not authenticated', async () => {
			const videoBuffer = createVideoBuffer();

			const response = await request(app)
				.post('/blog')
				.field('description', 'Test blog')
				.field('hasImage', 'false')
				.attach('video', videoBuffer, 'test-video.mp4');

			expect(response.status).toBe(401);
		});

		it('should return 401 when non-admin user tries to create blog', async () => {
			const videoBuffer = createVideoBuffer();

			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${userToken}`)
				.field('description', 'Test blog')
				.field('hasImage', 'false')
				.attach('video', videoBuffer, 'test-video.mp4');

			expect(response.status).toBe(401);
		});

		it('should return 400 when video file is missing', async () => {
			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Test blog')
				.field('hasImage', 'false');

			expect(response.status).toBe(400);
		});

		it('should return 400 when description is missing', async () => {
			const videoBuffer = createVideoBuffer();

			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('hasImage', 'false')
				.attach('video', videoBuffer, 'test-video.mp4');

			expect(response.status).toBe(400);
		});

		it('should return 400 when hasImage is true but image file is missing', async () => {
			const videoBuffer = createVideoBuffer();

			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Test blog')
				.field('hasImage', 'true')
				.attach('video', videoBuffer, 'test-video.mp4');

			expect(response.status).toBe(400);
		});

		it('should return 400 when non-video file is uploaded as video', async () => {
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Test blog')
				.field('hasImage', 'false')
				.attach('video', imageBuffer, 'test-image.jpg');

			expect(response.status).toBe(400);
		});

		it('should return 400 when invalid image type is uploaded', async () => {
			const videoBuffer = createVideoBuffer();
			const textBuffer = Buffer.from('This is a text file');

			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Test blog')
				.field('hasImage', 'true')
				.attach('video', videoBuffer, 'test-video.mp4')
				.attach('image', textBuffer, 'test.txt');

			expect(response.status).toBe(400);
		});
	});

	describe('GET /blog', () => {
		beforeEach(async () => {
			// Create some test blogs
			const videoBuffer = createVideoBuffer();
			const imageBuffer = createImageBuffer();

			// Create blog 1
			await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'First blog')
				.field('hasImage', 'false')
				.attach('video', videoBuffer, 'test-video-1.mp4');

			// Create blog 2
			await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Second blog')
				.field('hasImage', 'true')
				.attach('video', videoBuffer, 'test-video-2.mp4')
				.attach('image', imageBuffer, 'test-image-2.jpg');
		});

		it('should get all blogs (public route)', async () => {
			const response = await request(app).get('/blog');

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body).toBeDefined();
			expect(response.body.blogs).toBeInstanceOf(Array);
			expect(response.body.blogs.length).toBe(2);
			expect(response.body.blogs[0]).toHaveProperty('description');
			expect(response.body.blogs[0]).toHaveProperty('videoFilename');
			expect(response.body.blogs[0]).toHaveProperty('id');
			expect(response.body.blogs[0]).not.toHaveProperty('_id');
		});

		it('should return blogs sorted by createdAt descending', async () => {
			const response = await request(app).get('/blog');

			expect(response.status).toBe(200);
			expect(response.body.blogs.length).toBeGreaterThan(1);
			// Most recent should be first
			const firstDate = new Date(response.body.blogs[0].createdAt);
			const secondDate = new Date(response.body.blogs[1].createdAt);
			expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
		});
	});

	describe('GET /blog/:id', () => {
		let blogId: string;

		beforeEach(async () => {
			const videoBuffer = createVideoBuffer();
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/blog')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('description', 'Test blog for get by id')
				.field('hasImage', 'true')
				.attach('video', videoBuffer, 'test-video.mp4')
				.attach('image', imageBuffer, 'test-image.jpg');

			blogId = response.body.id;
		});

		it('should get a single blog by id (public route)', async () => {
			const response = await request(app).get(`/blog/${blogId}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body).toBeDefined();
			expect(response.body.id).toBe(blogId);
			expect(response.body.description).toBe('Test blog for get by id');
			expect(response.body.hasImage).toBe(true);
			expect(response.body).toHaveProperty('id');
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
});
