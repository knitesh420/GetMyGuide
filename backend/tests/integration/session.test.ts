import { StorageDB } from '@mongo';
import { sendPasswordResetEmail } from '@provider/email';
import AuthService from '@services/auth';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import configServer from '../../src/server-config';
import { testLoginData, testSignupData, testUser } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

// Mock email provider
jest.mock('@provider/email', () => ({
	sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

describe('Session API Integration Tests', () => {
	let app: express.Application;

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();
		// Ensure email mock returns true
		(sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);
	});

	describe('POST /session/signup', () => {
		it('should successfully register a new user', async () => {
			const response = await request(app).post('/session/signup').send(testSignupData);

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body).toHaveProperty('token');
			expect(response.body).toHaveProperty('user');
			expect(response.body.user.email).toBe(testSignupData.email.toLowerCase());
			expect(response.body.user.name).toBe(testSignupData.name);
		});

		it('should return 400 for invalid email', async () => {
			const invalidData = { ...testSignupData, email: 'invalid-email' };

			const response = await request(app).post('/session/signup').send(invalidData);

			expect(response.status).toBe(400);
			// Error responses may not have success field
			expect(response.body).toBeDefined();
		});

		it('should return 400 for short password', async () => {
			const invalidData = { ...testSignupData, password: '12345' };

			const response = await request(app).post('/session/signup').send(invalidData);

			expect(response.status).toBe(400);
			expect(response.body).toBeDefined();
		});

		it('should return 409 for duplicate email', async () => {
			await request(app).post('/session/signup').send(testSignupData);

			const response = await request(app).post('/session/signup').send(testSignupData);

			expect(response.status).toBe(409);
			expect(response.body).toBeDefined();
		});

		it('should create admin user when role is specified', async () => {
			const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' };

			const response = await request(app).post('/session/signup').send(adminData);

			expect(response.status).toBe(201);
			expect(response.body.user.role).toBe('admin');
		});
	});

	describe('POST /session/login', () => {
		beforeEach(async () => {
			await AuthService.signup(testUser);
		});

		it('should successfully login with valid credentials', async () => {
			const response = await request(app).post('/session/login').send(testLoginData);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body).toHaveProperty('token');
			expect(response.body).toHaveProperty('user');
			expect(response.body.user.email).toBe(testUser.email);
		});

		it('should return 401 for invalid email', async () => {
			const invalidData = { ...testLoginData, email: 'wrong@example.com' };

			const response = await request(app).post('/session/login').send(invalidData);

			expect(response.status).toBe(401);
			expect(response.body).toBeDefined();
		});

		it('should return 401 for invalid password', async () => {
			const invalidData = { ...testLoginData, password: 'wrongpassword' };

			const response = await request(app).post('/session/login').send(invalidData);

			expect(response.status).toBe(401);
			expect(response.body).toBeDefined();
		});

		it('should return 400 for invalid email format', async () => {
			const invalidData = { ...testLoginData, email: 'not-an-email' };

			const response = await request(app).post('/session/login').send(invalidData);

			expect(response.status).toBe(400);
		});
	});

	describe('POST /session/forgot-password', () => {
		beforeEach(async () => {
			await AuthService.signup(testUser);
		});

		it('should send password reset email for existing user', async () => {
			const response = await request(app)
				.post('/session/forgot-password')
				.send({ email: testUser.email });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.message).toContain('password reset link has been sent');
		});

		it('should not reveal if user exists (security)', async () => {
			const response = await request(app)
				.post('/session/forgot-password')
				.send({ email: 'nonexistent@example.com' });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should return 400 for invalid email format', async () => {
			const response = await request(app)
				.post('/session/forgot-password')
				.send({ email: 'invalid-email' });

			expect(response.status).toBe(400);
		});
	});

	describe('POST /session/reset-password', () => {
		let resetToken: string;

		beforeEach(async () => {
			await AuthService.signup(testUser);
			// Ensure email mock returns true before calling forgotPassword
			(sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);
			await AuthService.forgotPassword(testUser.email);

			// Find the storage document - the token is stored as the key
			const storage = await (StorageDB as unknown as mongoose.Model<{ key: string }>).findOne({});
			resetToken = storage?.key || '';
		});

		it('should successfully reset password with valid token', async () => {
			const response = await request(app)
				.post('/session/reset-password')
				.send({ token: resetToken, password: 'newpassword123' });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body).toHaveProperty('token');
			expect(response.body).toHaveProperty('user');
		});

		it('should return 401 for invalid token', async () => {
			const response = await request(app)
				.post('/session/reset-password')
				.send({ token: 'invalid-token', password: 'newpassword123' });

			expect(response.status).toBe(401);
			expect(response.body).toBeDefined();
		});

		it('should return 400 for short password', async () => {
			const response = await request(app)
				.post('/session/reset-password')
				.send({ token: resetToken, password: '12345' });

			expect(response.status).toBe(400);
		});
	});

	describe('GET /session/validate-auth', () => {
		let authToken: string;

		beforeEach(async () => {
			const signupResult = await AuthService.signup(testUser);
			authToken = signupResult.token;
		});

		it('should validate auth with Bearer token', async () => {
			const response = await request(app)
				.get('/session/validate-auth')
				.set('Authorization', `Bearer ${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.user).toBeDefined();
			expect(response.body.user.email).toBe(testUser.email);
		});

		it('should validate auth with cookie', async () => {
			const response = await request(app)
				.get('/session/validate-auth')
				.set('Cookie', [`auth-cookie=${authToken}`]);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should return 401 for invalid token', async () => {
			const response = await request(app)
				.get('/session/validate-auth')
				.set('Authorization', 'Bearer invalid-token');

			expect(response.status).toBe(401);
			expect(response.body).toBeDefined();
		});

		it('should return 401 when no token is provided', async () => {
			const response = await request(app).get('/session/validate-auth');

			expect(response.status).toBe(401);
			expect(response.body).toBeDefined();
		});
	});

	describe('POST /session/logout', () => {
		let authToken: string;

		beforeEach(async () => {
			const signupResult = await AuthService.signup(testUser);
			authToken = signupResult.token;
		});

		it('should successfully logout', async () => {
			const response = await request(app)
				.post('/session/logout')
				.set('Authorization', `Bearer ${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.message).toBe('Logged out successfully');
		});

		it('should return 401 when no token is provided', async () => {
			const response = await request(app).post('/session/logout');

			expect(response.status).toBe(401);
		});
	});

	describe('GET /session/validate-auth/admin', () => {
		let adminToken: string;
		let userToken: string;

		beforeEach(async () => {
			const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
			const adminResult = await AuthService.signup(adminData);
			adminToken = adminResult.token;

			const userResult = await AuthService.signup(testUser);
			userToken = userResult.token;
		});

		it('should allow admin to access admin route', async () => {
			const response = await request(app)
				.get('/session/validate-auth/admin')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should reject user from admin route', async () => {
			const response = await request(app)
				.get('/session/validate-auth/admin')
				.set('Authorization', `Bearer ${userToken}`);

			expect(response.status).toBe(401);
			expect(response.body).toBeDefined();
		});
	});
});
