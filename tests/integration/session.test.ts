import AuthService from '@services/auth';
import express from 'express';
import request from 'supertest';
import configServer from '../../server/server-config';
import { testSignupData, testUser } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

// This suite asserts on what gets emailed (it reads the OTP back out of the
// send call), so it declares its own email double rather than using the global
// no-op Proxy in tests/setup/mocks.ts.
//
// The implementations are installed in beforeEach, not in the factory below:
// jest.config sets `resetMocks: true`, which blanks a jest.fn before every test
// and would leave these resolving `undefined` — which AuthService reads as
// "email failed to send" and turns into a 500.
jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

import { sendPasswordResetOtpEmail, sendRegistrationOtpEmail } from '@provider/email';

/** Registration payload the current /register/send-otp validator accepts. */
const registration = {
	name: 'New User',
	email: 'newuser@example.com',
	phone: '+1234567892',
	countryCode: '+1',
	password: 'Password123',
	accountType: 'tourist' as 'tourist' | 'guide',
};

/** The 6-digit code the service handed to the email provider. */
function lastOtp(sender: unknown): string {
	const calls = (sender as jest.Mock).mock.calls;
	expect(calls.length).toBeGreaterThan(0);
	return calls[calls.length - 1][1];
}

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
		(sendPasswordResetOtpEmail as jest.Mock).mockResolvedValue(true);
		(sendRegistrationOtpEmail as jest.Mock).mockResolvedValue(true);
	});

	/**
	 * Register through the real two-step flow and return the created account.
	 * Registration is the only path that mints an email-verified account, which
	 * password login requires.
	 */
	async function registerViaOtp(overrides: Partial<typeof registration> = {}) {
		const payload = { ...registration, ...overrides };

		await request(app).post('/session/register/send-otp').send(payload).expect(200);

		const verify = await request(app)
			.post('/session/register/verify-otp')
			.send({ email: payload.email, otp: lastOtp(sendRegistrationOtpEmail) })
			.expect(201);

		return { payload, user: verify.body.user };
	}

	// Registration is a two-step OTP flow: send-otp parks the details in
	// PendingRegistration and mails a code, verify-otp is what actually creates
	// the account. There is no single-shot POST /session/signup.
	describe('POST /session/register/send-otp', () => {
		it('should accept a valid registration and email a code', async () => {
			const response = await request(app).post('/session/register/send-otp').send(registration);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(sendRegistrationOtpEmail).toHaveBeenCalledTimes(1);
			expect(lastOtp(sendRegistrationOtpEmail)).toMatch(/^\d{6}$/);
		});

		it('should not create the account until the code is verified', async () => {
			await request(app).post('/session/register/send-otp').send(registration).expect(200);

			const login = await request(app)
				.post('/session/login')
				.send({ email: registration.email, password: registration.password });

			expect(login.status).toBe(401);
		});

		it('should return 400 for invalid email', async () => {
			const response = await request(app)
				.post('/session/register/send-otp')
				.send({ ...registration, email: 'invalid-email' });

			expect(response.status).toBe(400);
		});

		it('should return 400 for a password that is not strong enough', async () => {
			const response = await request(app)
				.post('/session/register/send-otp')
				.send({ ...registration, password: 'weak' });

			expect(response.status).toBe(400);
		});

		it('should return 400 when the account type is not tourist or guide', async () => {
			const response = await request(app)
				.post('/session/register/send-otp')
				.send({ ...registration, accountType: 'admin' });

			expect(response.status).toBe(400);
		});

		it('should return 409 when the email already has an account', async () => {
			await registerViaOtp();

			const response = await request(app).post('/session/register/send-otp').send(registration);

			expect(response.status).toBe(409);
		});
	});

	describe('POST /session/register/verify-otp', () => {
		it('should create a verified account and set auth cookies', async () => {
			await request(app).post('/session/register/send-otp').send(registration).expect(200);

			const response = await request(app)
				.post('/session/register/verify-otp')
				.send({ email: registration.email, otp: lastOtp(sendRegistrationOtpEmail) });

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.user.email).toBe(registration.email);
			expect(response.body.user.name).toBe(registration.name);
			expect(response.body.user.role).toBe('tourist');

			// Tokens ride in httpOnly cookies, not in the body.
			const cookies = response.headers['set-cookie'] as unknown as string[];
			expect(cookies.some((c) => c.startsWith('auth-cookie='))).toBe(true);
			expect(cookies.some((c) => c.startsWith('refresh-cookie='))).toBe(true);
		});

		it('should register a guide when accountType is guide', async () => {
			const { user } = await registerViaOtp({
				email: 'newguide@example.com',
				phone: '+1234567893',
				accountType: 'guide',
			});

			expect(user.role).toBe('guide');
		});

		it('should return 401 for a wrong code', async () => {
			await request(app).post('/session/register/send-otp').send(registration).expect(200);

			const real = lastOtp(sendRegistrationOtpEmail);
			const wrong = real === '000000' ? '111111' : '000000';

			const response = await request(app)
				.post('/session/register/verify-otp')
				.send({ email: registration.email, otp: wrong });

			expect(response.status).toBe(401);
		});

		it('should return 400 for a malformed code', async () => {
			const response = await request(app)
				.post('/session/register/verify-otp')
				.send({ email: registration.email, otp: 'abc' });

			expect(response.status).toBe(400);
		});
	});

	describe('POST /session/login', () => {
		beforeEach(async () => {
			await registerViaOtp();
		});

		it('should successfully login with valid credentials', async () => {
			const response = await request(app)
				.post('/session/login')
				.send({ email: registration.email, password: registration.password });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.user.email).toBe(registration.email);

			const cookies = response.headers['set-cookie'] as unknown as string[];
			expect(cookies.some((c) => c.startsWith('auth-cookie='))).toBe(true);
		});

		it('should return 401 for invalid email', async () => {
			const response = await request(app)
				.post('/session/login')
				.send({ email: 'wrong@example.com', password: registration.password });

			expect(response.status).toBe(401);
		});

		it('should return 401 for invalid password', async () => {
			const response = await request(app)
				.post('/session/login')
				.send({ email: registration.email, password: 'WrongPassword123' });

			expect(response.status).toBe(401);
		});

		it('should return 400 for invalid email format', async () => {
			const response = await request(app)
				.post('/session/login')
				.send({ email: 'not-an-email', password: registration.password });

			expect(response.status).toBe(400);
		});

		it('should refuse password login for an unverified account', async () => {
			// AuthService.signup creates the account directly, leaving it
			// non-verified — the state legacy accounts are in.
			await AuthService.signup(testUser);

			const response = await request(app)
				.post('/session/login')
				.send({ email: testUser.email, password: testUser.password });

			expect(response.status).toBe(401);
		});

		it('should refuse password login for an admin', async () => {
			// Admins authenticate through the OTP flow; password login must not be
			// a second door into a privileged account.
			const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
			await AuthService.signup(adminData);

			const response = await request(app)
				.post('/session/login')
				.send({ email: adminData.email, password: adminData.password });

			expect(response.status).toBe(401);
		});
	});

	describe('POST /session/forgot-password', () => {
		beforeEach(async () => {
			await AuthService.signup(testUser);
		});

		it('should send a password reset code for an existing user', async () => {
			const response = await request(app)
				.post('/session/forgot-password')
				.send({ email: testUser.email });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.message).toContain('password reset code has been sent');
			expect(sendPasswordResetOtpEmail).toHaveBeenCalledTimes(1);
		});

		it('should not reveal if user exists (security)', async () => {
			const response = await request(app)
				.post('/session/forgot-password')
				.send({ email: 'nonexistent@example.com' });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			// Same body as the hit above, and no mail sent.
			expect(response.body.message).toContain('password reset code has been sent');
			expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
		});

		it('should return 400 for invalid email format', async () => {
			const response = await request(app)
				.post('/session/forgot-password')
				.send({ email: 'invalid-email' });

			expect(response.status).toBe(400);
		});
	});

	// Reset is OTP-based: the code goes to the address on file and is redeemed
	// with { email, otp, newPassword }. There is no emailed reset-link token.
	describe('POST /session/reset-password', () => {
		let otp: string;

		beforeEach(async () => {
			await AuthService.signup(testUser);
			await request(app)
				.post('/session/forgot-password')
				.send({ email: testUser.email })
				.expect(200);
			otp = lastOtp(sendPasswordResetOtpEmail);
		});

		it('should successfully reset password with a valid code', async () => {
			const response = await request(app)
				.post('/session/reset-password')
				.send({ email: testUser.email, otp, newPassword: 'NewPassword123' });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.user.email).toBe(testUser.email);

			// The new password works, and resetting also verifies the address —
			// which is what lets a legacy unverified account log in again.
			const login = await request(app)
				.post('/session/login')
				.send({ email: testUser.email, password: 'NewPassword123' });
			expect(login.status).toBe(200);
		});

		it('should invalidate the code after a successful reset', async () => {
			await request(app)
				.post('/session/reset-password')
				.send({ email: testUser.email, otp, newPassword: 'NewPassword123' })
				.expect(200);

			const replay = await request(app)
				.post('/session/reset-password')
				.send({ email: testUser.email, otp, newPassword: 'AnotherPassword123' });

			expect(replay.status).toBe(401);
		});

		it('should return 401 for an incorrect code', async () => {
			const wrong = otp === '000000' ? '111111' : '000000';

			const response = await request(app)
				.post('/session/reset-password')
				.send({ email: testUser.email, otp: wrong, newPassword: 'NewPassword123' });

			expect(response.status).toBe(401);
		});

		it('should return 400 for a malformed code', async () => {
			const response = await request(app)
				.post('/session/reset-password')
				.send({ email: testUser.email, otp: 'invalid-token', newPassword: 'NewPassword123' });

			expect(response.status).toBe(400);
		});

		it('should return 400 for a weak new password', async () => {
			const response = await request(app)
				.post('/session/reset-password')
				.send({ email: testUser.email, otp, newPassword: '12345' });

			expect(response.status).toBe(400);
		});
	});

	describe('GET /session/validate-auth', () => {
		let authToken: string;

		beforeEach(async () => {
			const signupResult = await AuthService.signup(testUser);
			authToken = signupResult.accessToken;
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
		});

		it('should return 401 when no token is provided', async () => {
			const response = await request(app).get('/session/validate-auth');

			expect(response.status).toBe(401);
		});
	});

	describe('POST /session/logout', () => {
		let authToken: string;

		beforeEach(async () => {
			const signupResult = await AuthService.signup(testUser);
			authToken = signupResult.accessToken;
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
			adminToken = adminResult.accessToken;

			const userResult = await AuthService.signup(testUser);
			userToken = userResult.accessToken;
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

			// 403, not 401: the caller is authenticated, they just outrank nothing.
			// 401 would tell a signed-in tourist to go and log in again.
			expect(response.status).toBe(403);
		});
	});
});
