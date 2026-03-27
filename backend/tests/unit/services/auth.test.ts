import AuthService from '@services/auth';
import { AccountDB, StorageDB } from '@mongo';
import { ConflictError, UnauthorizedError, NotFoundError } from 'node-be-utilities';
import mongoose from 'mongoose';
import { sendPasswordResetEmail } from '@provider/email';
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../setup/db.setup';
import { testUser, testSignupData, testLoginData } from '../../helpers/fixtures';

// Mock email provider
jest.mock('@provider/email', () => ({
	sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

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
		// Ensure email mock returns true
		(sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);
	});

	describe('signup', () => {
		it('should successfully register a new user', async () => {
			const result = await AuthService.signup(testSignupData);

			expect(result).toHaveProperty('token');
			expect(result).toHaveProperty('user');
			expect(result.user.email).toBe(testSignupData.email.toLowerCase());
			expect(result.user.name).toBe(testSignupData.name);
			expect(result.user.role).toBe('tourist');
			expect(result.user.status).toBe('non_verified');
			expect(result.token).toBeDefined();
		});

		it('should throw ConflictError if email already exists', async () => {
			await AuthService.signup(testSignupData);

			await expect(AuthService.signup(testSignupData)).rejects.toThrow(ConflictError);
		});

		it('should create user with admin role when specified', async () => {
			const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
			const result = await AuthService.signup(adminData);

			expect(result.user.role).toBe('admin');
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
		});

		it('should successfully login with valid credentials', async () => {
			const result = await AuthService.login(testLoginData);

			expect(result).toHaveProperty('token');
			expect(result).toHaveProperty('user');
			expect(result.user.email).toBe(testUser.email);
			expect(result.token).toBeDefined();
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

		it('should generate reset token and send email for existing user', async () => {
			await AuthService.forgotPassword(testUser.email);

			expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.any(String), expect.any(String));

			const storageKeys = await (StorageDB as unknown as mongoose.Model<unknown>).find({});
			expect(storageKeys.length).toBeGreaterThan(0);
		});

		it('should not throw error for non-existent user (security)', async () => {
			await expect(AuthService.forgotPassword('nonexistent@example.com')).resolves.not.toThrow();

			expect(sendPasswordResetEmail).not.toHaveBeenCalled();
		});

		it('should throw ServerError if email sending fails', async () => {
			(sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(false);

			await expect(AuthService.forgotPassword(testUser.email)).rejects.toThrow();
		});
	});

	describe('resetPassword', () => {
		let resetToken: string;

		beforeEach(async () => {
			await AuthService.signup(testUser);
			await AuthService.forgotPassword(testUser.email);

			// Get the reset token from storage
			const storage = await (StorageDB as unknown as mongoose.Model<{ key: string }>).findOne({});
			resetToken = storage?.key || '';
		});

		it('should successfully reset password with valid token', async () => {
			const newPassword = 'newpassword123';
			const result = await AuthService.resetPassword(resetToken, newPassword);

			expect(result).toHaveProperty('token');
			expect(result).toHaveProperty('user');

			// Verify new password works
			const loginResult = await AuthService.login({
				email: testUser.email,
				password: newPassword,
			});
			expect(loginResult).toBeDefined();
		});

		it('should throw UnauthorizedError for invalid token', async () => {
			await expect(AuthService.resetPassword('invalid-token', 'newpassword123')).rejects.toThrow(
				UnauthorizedError
			);
		});

		it('should throw UnauthorizedError for expired token', async () => {
			// Delete the token to simulate expiration
			await StorageDB.deleteOne({ key: resetToken });

			await expect(AuthService.resetPassword(resetToken, 'newpassword123')).rejects.toThrow(
				UnauthorizedError
			);
		});

		it('should delete reset token after successful reset', async () => {
			const newPassword = 'newpassword123';
			await AuthService.resetPassword(resetToken, newPassword);

			const tokenExists = await (StorageDB as unknown as mongoose.Model<unknown>).findOne({
				key: resetToken,
			});
			expect(tokenExists).toBeNull();
		});

		it('should throw NotFoundError if user not found', async () => {
			// Create a token with invalid user ID
			const fakeUserId = '507f1f77bcf86cd799439999';
			await (StorageDB as unknown as mongoose.Model<unknown>).create({
				key: 'fake-token',
				value: fakeUserId,
			});

			await expect(AuthService.resetPassword('fake-token', 'newpassword123')).rejects.toThrow(
				NotFoundError
			);
		});
	});
});
