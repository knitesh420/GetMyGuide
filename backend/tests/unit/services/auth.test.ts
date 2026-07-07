import AuthService from '@services/auth';
import { AccountDB, StorageDB } from '@mongo';
import { ConflictError, UnauthorizedError, NotFoundError } from 'node-be-utilities';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { sendPasswordResetOtpEmail } from '@provider/email';
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../setup/db.setup';
import { testUser, testSignupData, testLoginData } from '../../helpers/fixtures';

// Mock email provider
jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn().mockResolvedValue(true),
	sendRegistrationOtpEmail: jest.fn().mockResolvedValue(true),
	sendAdminOtpEmail: jest.fn().mockResolvedValue(true),
}));

function differentOtp(otp: string): string {
	const next = (parseInt(otp, 10) + 1) % 1_000_000;
	return next.toString().padStart(6, '0');
}

describe('AuthService', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();
		(sendPasswordResetOtpEmail as jest.Mock).mockResolvedValue(true);
	});

	describe('signup', () => {
		it('should successfully register a new user', async () => {
			const result = await AuthService.signup(testSignupData);

			expect(result).toHaveProperty('accessToken');
			expect(result).toHaveProperty('user');
			expect(result.user.email).toBe(testSignupData.email.toLowerCase());
			expect(result.user.name).toBe(testSignupData.name);
			expect(result.user.role).toBe('tourist');
			expect(result.user.status).toBe('non_verified');
			expect(result.accessToken).toBeDefined();
		});

		it('should throw ConflictError if email already exists', async () => {
			await AuthService.signup(testSignupData);

			await expect(AuthService.signup(testSignupData)).rejects.toThrow(ConflictError);
		});

		it('should lowercase email addresses', async () => {
			const dataWithUppercase = { ...testSignupData, email: 'TEST@EXAMPLE.COM' };
			const result = await AuthService.signup(dataWithUppercase);

			expect(result.user.email).toBe('test@example.com');
		});

		it('should hash password before saving', async () => {
			const result = await AuthService.signup(testSignupData);
			const user = await AccountDB.findById(result.user.id).select('+password');

			expect(user?.password).toBeDefined();
			expect(user?.password).not.toBe(testSignupData.password);
		});
	});

	describe('login', () => {
		beforeEach(async () => {
			await AuthService.signup(testUser);
			// Legacy `signup` deliberately leaves emailVerified:false (see
			// AuthService.signup's doc comment) — simulate an already-verified
			// pre-existing account, same as what backfillEmailVerified.ts does.
			await AccountDB.findOneAndUpdate({ email: testUser.email }, { emailVerified: true });
		});

		it('should successfully login with valid credentials', async () => {
			const result = await AuthService.login(testLoginData);

			expect(result).toHaveProperty('accessToken');
			expect(result).toHaveProperty('user');
			expect(result.user.email).toBe(testUser.email);
			expect(result.accessToken).toBeDefined();
		});

		it('should throw UnauthorizedError for invalid email', async () => {
			const invalidData = { ...testLoginData, email: 'nonexistent@example.com' };

			await expect(AuthService.login(invalidData)).rejects.toThrow(UnauthorizedError);
		});

		it('should throw UnauthorizedError for invalid password', async () => {
			const invalidData = { ...testLoginData, password: 'wrongpassword' };

			await expect(AuthService.login(invalidData)).rejects.toThrow(UnauthorizedError);
		});

		it('should throw UnauthorizedError for deactivated account', async () => {
			const user = await AccountDB.findOne({ email: testUser.email });
			if (user) {
				user.isActive = false;
				await user.save();
			}

			await expect(AuthService.login(testLoginData)).rejects.toThrow(UnauthorizedError);
		});

		it('should throw UnauthorizedError when email is not verified', async () => {
			await AccountDB.findOneAndUpdate({ email: testUser.email }, { emailVerified: false });

			await expect(AuthService.login(testLoginData)).rejects.toThrow(UnauthorizedError);
		});

		it('should lowercase email during login', async () => {
			const uppercaseData = { ...testLoginData, email: 'TEST@EXAMPLE.COM' };
			const result = await AuthService.login(uppercaseData);

			expect(result.user.email).toBe(testUser.email);
		});
	});

	describe('forgotPassword', () => {
		beforeEach(async () => {
			await AuthService.signup(testUser);
		});

		it('should generate a reset OTP and send email for existing user', async () => {
			await AuthService.forgotPassword(testUser.email);

			expect(sendPasswordResetOtpEmail).toHaveBeenCalledWith(
				testUser.email,
				expect.stringMatching(/^\d{6}$/)
			);

			const storageKeys = await (StorageDB as unknown as mongoose.Model<unknown>).find({});
			expect(storageKeys.length).toBeGreaterThan(0);
		});

		it('should not throw error for non-existent user (security)', async () => {
			await expect(AuthService.forgotPassword('nonexistent@example.com')).resolves.not.toThrow();

			expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
		});

		it('should throw ServerError if email sending fails', async () => {
			(sendPasswordResetOtpEmail as jest.Mock).mockResolvedValueOnce(false);

			await expect(AuthService.forgotPassword(testUser.email)).rejects.toThrow();
		});
	});

	describe('resetPassword', () => {
		let capturedOtp: string;

		beforeEach(async () => {
			await AuthService.signup(testUser);
			await AccountDB.findOneAndUpdate({ email: testUser.email }, { emailVerified: false });

			await AuthService.forgotPassword(testUser.email);
			capturedOtp = (sendPasswordResetOtpEmail as jest.Mock).mock.calls[0][1];
		});

		it('should successfully reset password with a valid OTP', async () => {
			const newPassword = 'newpassword123';
			const result = await AuthService.resetPassword(testUser.email, capturedOtp, newPassword);

			expect(result).toHaveProperty('accessToken');
			expect(result).toHaveProperty('user');

			// Verify new password works
			const loginResult = await AuthService.login({
				email: testUser.email,
				password: newPassword,
			});
			expect(loginResult).toBeDefined();
		});

		it('should mark the account emailVerified after a successful reset', async () => {
			await AuthService.resetPassword(testUser.email, capturedOtp, 'newpassword123');

			const user = await AccountDB.findOne({ email: testUser.email });
			expect(user?.emailVerified).toBe(true);
		});

		it('should throw UnauthorizedError for an incorrect OTP', async () => {
			await expect(
				AuthService.resetPassword(testUser.email, differentOtp(capturedOtp), 'newpassword123')
			).rejects.toThrow(UnauthorizedError);
		});

		it('should throw UnauthorizedError for an expired/missing OTP record', async () => {
			await StorageDB.deleteOne({ key: 'pwreset-otp:' + testUser.email });

			await expect(
				AuthService.resetPassword(testUser.email, capturedOtp, 'newpassword123')
			).rejects.toThrow(UnauthorizedError);
		});

		it('should delete the reset OTP record after a successful reset', async () => {
			await AuthService.resetPassword(testUser.email, capturedOtp, 'newpassword123');

			const record = await StorageDB.findOne({ key: 'pwreset-otp:' + testUser.email });
			expect(record).toBeNull();
		});

		it('should throw NotFoundError if the user no longer exists', async () => {
			const fakeEmail = 'ghost@example.com';
			const otp = '654321';
			const otpHash = await bcrypt.hash(otp, 10);
			await StorageDB.create({
				key: 'pwreset-otp:' + fakeEmail,
				object: { userId: '507f1f77bcf86cd799439999', hash: otpHash, attempts: 0 },
				expireAt: new Date(Date.now() + 10 * 60 * 1000),
			});

			await expect(AuthService.resetPassword(fakeEmail, otp, 'newpassword123')).rejects.toThrow(
				NotFoundError
			);
		});
	});
});
