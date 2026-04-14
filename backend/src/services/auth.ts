import bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
	ServerError,
	UnauthorizedError,
} from 'node-be-utilities';
import { AccountDB, StorageDB } from '@mongo';
import { sendAdminOtpEmail, sendPasswordResetEmail } from '@provider/email';
import JWTService, { JWTPayload } from '@services/jwt';
import { OTP_MAX_VERIFY_ATTEMPTS, OTP_TTL_SECONDS } from '@config/const';

interface SignupData {
	name: string;
	email: string;
	phone: string;
	password: string;
}

interface LoginData {
	email: string;
	password: string;
}

interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

interface PublicUser {
	id: string;
	name: string;
	email: string;
	phone: string;
	role: 'tourist' | 'guide' | 'admin';
	status: string;
}

interface AuthResponse extends TokenPair {
	user: PublicUser;
}

function toPublicUser(user: any): PublicUser {
	return {
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		phone: user.phone,
		role: user.role,
		status: user.status,
	};
}

function issueTokens(user: any): TokenPair {
	const accessPayload: JWTPayload = {
		userId: user._id.toString(),
		role: user.role,
		email: user.email,
		name: user.name,
		tokenVersion: user.tokenVersion ?? 0,
	};
	const accessToken = JWTService.generateAccessToken(accessPayload);
	const refreshToken = JWTService.generateRefreshToken({
		userId: user._id.toString(),
		tokenVersion: user.tokenVersion ?? 0,
	});
	return { accessToken, refreshToken };
}

class AuthService {
	/**
	 * Public signup — always creates a tourist account.
	 * Admin and guide accounts must be created via seed / internal flows.
	 */
	async signup(data: SignupData): Promise<AuthResponse> {
		const existingUser = await AccountDB.findOne({ email: data.email.toLowerCase() });
		if (existingUser) {
			throw new ConflictError('User with this email already exists');
		}

		const user = await AccountDB.create({
			name: data.name,
			email: data.email.toLowerCase(),
			phone: data.phone,
			password: data.password,
			role: 'tourist',
			status: 'non_verified',
			isActive: true,
		});

		return { ...issueTokens(user), user: toPublicUser(user) };
	}

	async login(data: LoginData): Promise<AuthResponse> {
		const user = await AccountDB.findOne({ email: data.email.toLowerCase() }).select('+password');
		if (!user) {
			throw new UnauthorizedError('Invalid email or password');
		}

		const isPasswordValid = await user.verifyPassword(data.password);
		if (!isPasswordValid) {
			throw new UnauthorizedError('Invalid email or password');
		}

		if (!user.isActive) {
			throw new UnauthorizedError('Account is deactivated');
		}

		// Admin accounts must go through OTP — block password-only login.
		if (user.role === 'admin') {
			throw new UnauthorizedError('Admin accounts must log in via OTP');
		}

		return { ...issueTokens(user), user: toPublicUser(user) };
	}

	/**
	 * Rotate refresh token. Verifies the token, checks tokenVersion against DB,
	 * and returns a fresh access + refresh pair.
	 */
	async refresh(refreshToken: string): Promise<AuthResponse> {
		const payload = JWTService.verifyRefreshToken(refreshToken);
		if (!payload) {
			throw new UnauthorizedError('Invalid or expired refresh token');
		}

		const user = await AccountDB.findById(payload.userId);
		if (!user || !user.isActive) {
			throw new UnauthorizedError('Account not available');
		}

		if ((user.tokenVersion ?? 0) !== payload.tokenVersion) {
			throw new UnauthorizedError('Refresh token has been revoked');
		}

		return { ...issueTokens(user), user: toPublicUser(user) };
	}

	/**
	 * Invalidate every token previously issued for this user by bumping
	 * tokenVersion. Existing access/refresh tokens fail verification on next use.
	 */
	async logout(userId: string): Promise<void> {
		await AccountDB.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
	}

	async forgotPassword(email: string): Promise<void> {
		const user = await AccountDB.findOne({ email: email.toLowerCase() });
		if (!user) {
			// Don't reveal existence
			return;
		}

		const resetToken = randomBytes(32).toString('hex');
		await StorageDB.setString('pwreset:' + resetToken, user._id.toString());

		const resetBaseUrl =
			process.env.PASSWORD_RESET_BASE_URL ?? 'http://localhost:5173/reset-password';
		const emailSent = await sendPasswordResetEmail(user.email, resetToken, resetBaseUrl);
		if (!emailSent) {
			throw new ServerError('Failed to send password reset email');
		}
	}

	async sendLoginOtp(email: string): Promise<void> {
		const user = await AccountDB.findOne({ email: email.toLowerCase() });
		// Uniform response to avoid account enumeration
		if (!user || user.role !== 'admin' || !user.isActive) {
			return;
		}

		// Generate 6-digit OTP using a crypto-secure RNG
		const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
		const otpHash = await bcrypt.hash(otp, 10);

		const key = 'admin-otp:' + email.toLowerCase();
		// Overwrite any previous OTP with an explicit 5-minute expiry
		await StorageDB.deleteOne({ key });
		await StorageDB.create({
			key,
			object: { hash: otpHash, attempts: 0 },
			expireAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
		});

		const emailSent = await sendAdminOtpEmail(user.email, otp);
		if (!emailSent) {
			throw new ServerError('Failed to send OTP email');
		}
	}

	async loginWithOtp(email: string, otp: string): Promise<AuthResponse> {
		const normalized = email.toLowerCase();
		const user = await AccountDB.findOne({ email: normalized });
		if (!user || user.role !== 'admin' || !user.isActive) {
			throw new UnauthorizedError('Invalid email or OTP');
		}

		const key = 'admin-otp:' + normalized;
		const record = await StorageDB.findOne({ key });
		if (!record || !record.object) {
			throw new UnauthorizedError('Invalid or expired OTP');
		}

		const stored = record.object as { hash: string; attempts: number };

		if (stored.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
			await StorageDB.deleteOne({ key });
			throw new UnauthorizedError('Too many OTP attempts; request a new code');
		}

		const valid = await bcrypt.compare(otp, stored.hash);
		if (!valid) {
			record.object = { ...stored, attempts: stored.attempts + 1 };
			record.markModified('object');
			await record.save();
			throw new UnauthorizedError('Invalid or expired OTP');
		}

		// OTP is single-use — delete immediately on success
		await StorageDB.deleteOne({ key });

		return { ...issueTokens(user), user: toPublicUser(user) };
	}

	async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
		const storageKey = 'pwreset:' + token;
		const userId = await StorageDB.getString(storageKey);
		if (!userId) {
			throw new UnauthorizedError('Invalid or expired reset token');
		}

		const user = await AccountDB.findById(userId).select('+password');
		if (!user) {
			throw new NotFoundError('User not found');
		}

		user.password = newPassword;
		// Invalidate every previously-issued token on password change
		user.tokenVersion = (user.tokenVersion ?? 0) + 1;
		await user.save();

		await StorageDB.deleteOne({ key: storageKey });

		return { ...issueTokens(user), user: toPublicUser(user) };
	}

	/**
	 * Used only by seed scripts / protected internal routes to create admins.
	 * Never invoked from a public HTTP handler.
	 */
	async createAdmin(data: SignupData): Promise<PublicUser> {
		const existing = await AccountDB.findOne({ email: data.email.toLowerCase() });
		if (existing) {
			throw new ConflictError('Account with this email already exists');
		}
		if (!data.password || data.password.length < 12) {
			throw new BadRequestError('Admin password must be at least 12 characters');
		}

		const user = await AccountDB.create({
			name: data.name,
			email: data.email.toLowerCase(),
			phone: data.phone,
			password: data.password,
			role: 'admin',
			status: 'verified',
			isActive: true,
		});
		return toPublicUser(user);
	}
}

export default new AuthService();
