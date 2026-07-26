import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
	ServerError,
	TooManyRequestsError,
	UnauthorizedError,
} from 'node-be-utilities';
import { AccountDB, PendingRegistrationDB, StorageDB } from '@mongo';
import {
	sendAdminOtpEmail,
	sendPasswordResetOtpEmail,
	sendRegistrationOtpEmail,
} from '@provider/email';
import JWTService, { JWTPayload } from '@services/jwt';
import {
	OTP_MAX_VERIFY_ATTEMPTS,
	OTP_TTL_SECONDS,
	PASSWORD_RESET_OTP_TTL_SECONDS,
	PENDING_REGISTRATION_TTL_SECONDS,
	REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS,
	REGISTRATION_OTP_TTL_SECONDS,
} from '@config/const';

interface SignupData {
	name: string;
	email: string;
	phone: string;
	password: string;
	/**
	 * Role to seed. Optional and defaults to 'tourist'. This method is internal —
	 * there is no public HTTP signup route (registration goes through the
	 * OTP-verified flow), and nothing in src/ calls it — so honouring a role here
	 * cannot let a public caller mint a privileged account. Integration suites use
	 * it to seed admin/guide fixtures directly instead of signing up and promoting.
	 */
	role?: 'tourist' | 'guide' | 'admin';
}

interface RegisterSendOtpData {
	name: string;
	email: string;
	phone: string;
	countryCode: string;
	password: string;
	accountType: 'tourist' | 'guide';
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
	 * Internal signup — used by integration test helpers to seed fixture accounts.
	 * The public HTTP endpoint POST /session/signup has been removed; new user
	 * registrations go through the OTP-verified flow (POST /session/register/*).
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
			role: data.role ?? 'tourist',
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
		//
		// Deliberately the same message as a bad password: a distinct one told an
		// attacker holding valid credentials that they had found an admin, and
		// told anyone probing addresses which ones were privileged. Admins reach
		// their own flow through the admin login page, not by discovering this.
		if (user.role === 'admin') {
			throw new UnauthorizedError('Invalid email or password');
		}

		// NOTE: only ever ship this check after backfillEmailVerified.ts has been
		// run and confirmed against the target database — see that script's
		// header comment for why.
		if (!user.emailVerified) {
			throw new UnauthorizedError('Please verify your email before logging in');
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
		const normalized = email.toLowerCase();
		const user = await AccountDB.findOne({ email: normalized });
		if (!user) {
			// Don't reveal existence
			return;
		}

		const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
		const otpHash = await bcrypt.hash(otp, 10);

		const key = 'pwreset-otp:' + normalized;
		// Overwrite any previous OTP with a fresh expiry — old codes become invalid.
		await StorageDB.deleteOne({ key });
		await StorageDB.create({
			key,
			object: { userId: user._id.toString(), hash: otpHash, attempts: 0 },
			expireAt: new Date(Date.now() + PASSWORD_RESET_OTP_TTL_SECONDS * 1000),
		});

		const emailSent = await sendPasswordResetOtpEmail(user.email, otp);
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

	async resetPassword(email: string, otp: string, newPassword: string): Promise<AuthResponse> {
		const normalized = email.toLowerCase();
		const key = 'pwreset-otp:' + normalized;
		const record = await StorageDB.findOne({ key });
		if (!record || !record.object) {
			throw new UnauthorizedError('Invalid or expired code');
		}

		const stored = record.object as { userId: string; hash: string; attempts: number };

		if (stored.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
			await StorageDB.deleteOne({ key });
			throw new UnauthorizedError('Too many incorrect attempts; request a new code');
		}

		const valid = await bcrypt.compare(otp, stored.hash);
		if (!valid) {
			record.object = { ...stored, attempts: stored.attempts + 1 };
			record.markModified('object');
			await record.save();
			throw new UnauthorizedError('Invalid or expired code');
		}

		const user = await AccountDB.findById(stored.userId).select('+password');
		if (!user) {
			throw new NotFoundError('User not found');
		}

		user.password = newPassword;
		// Receiving and typing back a 6-digit code sent to this address is the
		// same proof-of-inbox-ownership as registration OTP — this is also the
		// de facto first-login remediation path for legacy guide accounts whose
		// auto-generated password was never emailed to them.
		user.emailVerified = true;
		// Invalidate every previously-issued token on password change
		user.tokenVersion = (user.tokenVersion ?? 0) + 1;
		await user.save();

		await StorageDB.deleteOne({ key });

		return { ...issueTokens(user), user: toPublicUser(user) };
	}

	async sendRegistrationOtp(data: RegisterSendOtpData): Promise<void> {
		const email = data.email.toLowerCase();

		const existingAccount = await AccountDB.findOne({
			$or: [{ email }, { phone: data.phone }],
		});
		if (existingAccount) {
			throw new ConflictError('An account with this email or phone already exists');
		}

		const existingPending = await PendingRegistrationDB.findOne({ email });
		if (existingPending) {
			const secondsSinceLastSend =
				(Date.now() - existingPending.lastSentAt.getTime()) / 1000;
			if (secondsSinceLastSend < REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS) {
				const wait = Math.ceil(REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
				throw new TooManyRequestsError(`Please wait ${wait}s before requesting another code`);
			}
		}

		const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
		const otpHash = await bcrypt.hash(otp, 10);
		const passwordHash = await bcrypt.hash(data.password, 10);
		const now = new Date();

		// Upsert — this IS the resend mechanism: a fresh send always overwrites
		// the previous OTP/expiry/attempts, invalidating any prior code.
		await PendingRegistrationDB.findOneAndUpdate(
			{ email },
			{
				name: data.name,
				email,
				phone: data.phone,
				countryCode: data.countryCode,
				passwordHash,
				accountType: data.accountType,
				otpHash,
				otpExpiresAt: new Date(now.getTime() + REGISTRATION_OTP_TTL_SECONDS * 1000),
				attempts: 0,
				lastSentAt: now,
				expireAt: new Date(now.getTime() + PENDING_REGISTRATION_TTL_SECONDS * 1000),
			},
			{ upsert: true, setDefaultsOnInsert: true }
		);

		const emailSent = await sendRegistrationOtpEmail(email, otp);
		if (!emailSent) {
			throw new ServerError('Failed to send verification email');
		}
	}

	async verifyRegistrationOtp(email: string, otp: string): Promise<AuthResponse> {
		const normalized = email.toLowerCase();
		const pending = await PendingRegistrationDB.findOne({ email: normalized }).select(
			'+passwordHash +otpHash'
		);
		if (!pending) {
			throw new UnauthorizedError('Invalid or expired code');
		}

		if (pending.otpExpiresAt.getTime() < Date.now()) {
			throw new UnauthorizedError('Code has expired; request a new one');
		}

		if (pending.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
			await PendingRegistrationDB.deleteOne({ _id: pending._id });
			throw new UnauthorizedError('Too many incorrect attempts; request a new code');
		}

		const valid = await bcrypt.compare(otp, pending.otpHash);
		if (!valid) {
			pending.attempts += 1;
			await pending.save();
			throw new UnauthorizedError('Invalid code');
		}

		// Race guard: someone may have registered with this email/phone in the
		// window between send-otp and verify-otp.
		const existingAccount = await AccountDB.findOne({
			$or: [{ email: normalized }, { phone: pending.phone }],
		});
		if (existingAccount) {
			await PendingRegistrationDB.deleteOne({ _id: pending._id });
			throw new ConflictError('An account with this email or phone already exists');
		}

		const account = new AccountDB({
			name: pending.name,
			email: pending.email,
			phone: pending.phone,
			countryCode: pending.countryCode,
			password: pending.passwordHash,
			role: pending.accountType,
			status: 'verified',
			emailVerified: true,
			isActive: true,
		});
		// passwordHash is already bcrypt-hashed at rest — skip the pre-save
		// re-hash or login will never work again (see Account.ts's pre('save')).
		account.$locals.skipPasswordHash = true;
		await account.save();

		await PendingRegistrationDB.deleteOne({ _id: pending._id });

		return { ...issueTokens(account), user: toPublicUser(account) };
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
			emailVerified: true,
			isActive: true,
		});
		return toPublicUser(user);
	}
}

export default new AuthService();
