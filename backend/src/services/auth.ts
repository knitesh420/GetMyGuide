import bcrypt from 'bcrypt';
import { createHash, randomInt } from 'crypto';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
	ServerError,
	TooManyRequestsError,
	UnauthorizedError,
} from 'node-be-utilities';
import { AccountDB, GuideDB, PendingRegistrationDB, StorageDB } from '@mongo';
import { PendingGuideDraft } from '@mongo/types/pendingRegistration';
import {
	sendAdminOtpEmail,
	sendPasswordResetOtpEmail,
	sendRegistrationOtpEmail,
} from '@provider/email';
import JWTService, { JWTPayload } from '@services/jwt';
import GuideService from '@services/guide';
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
	city?: string;
	type?: 'normal' | 'escort';
	languages?: string[];
	pan?: string;
	guideDraft?: PendingGuideDraft;
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
	private registrationPhoneKey(phone: string): string {
		const phoneHash = createHash('sha256').update(phone).digest('hex');
		return `registration-phone:${phoneHash}`;
	}

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
		if (data.accountType === 'guide') {
			const draft = data.guideDraft;
			if (
				!draft?.city ||
				!draft.type ||
				draft.languages.length === 0 ||
				!draft.profileImage ||
				draft.identityProofs.length !== 2 ||
				(draft.type === 'escort' && !draft.pan)
			) {
				throw new BadRequestError('Guide registration requires a complete profile, photo, licence, and Aadhaar');
			}
		}

		const existingAccount = await AccountDB.findOne({
			$or: [{ email }, { phone: data.phone }],
		});
		if (existingAccount) {
			throw new ConflictError('An account with this email or phone already exists');
		}

		const existingPending = await PendingRegistrationDB.findOne({ email });
		if (existingPending) {
			if (existingPending.expireAt <= new Date() && existingPending.status !== 'finalizing') {
				await PendingRegistrationDB.deleteOne({ _id: existingPending._id });
				await StorageDB.deleteOne({
					key: this.registrationPhoneKey(existingPending.phone),
					'object.email': email,
				});
			} else {
			throw new ConflictError('A registration is already pending for this email; resend its verification code');
			}
		}

		const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
		const otpHash = await bcrypt.hash(otp, 10);
		const passwordHash = await bcrypt.hash(data.password, 10);
		const now = new Date();

		const phoneKey = this.registrationPhoneKey(data.phone);
		try {
			await StorageDB.create({
				key: phoneKey,
				object: { email },
				expireAt: new Date(now.getTime() + PENDING_REGISTRATION_TTL_SECONDS * 1000),
			});
		} catch (error) {
			if ((error as { code?: number }).code === 11000) {
				const existingReservation = await StorageDB.findOne({ key: phoneKey });
				if (existingReservation && existingReservation.expireAt <= now) {
					await StorageDB.deleteOne({ _id: existingReservation._id });
					return this.sendRegistrationOtp(data);
				}
				throw new ConflictError('A registration is already pending for this phone number');
			}
			throw error;
		}

		try {
			await PendingRegistrationDB.create({
				name: data.name,
				email,
				phone: data.phone,
				countryCode: data.countryCode,
				passwordHash,
				accountType: data.accountType,
				...(data.guideDraft ? { guideDraft: data.guideDraft } : {}),
				otpHash,
				otpExpiresAt: new Date(now.getTime() + REGISTRATION_OTP_TTL_SECONDS * 1000),
				attempts: 0,
				lastSentAt: now,
				expireAt: new Date(now.getTime() + PENDING_REGISTRATION_TTL_SECONDS * 1000),
			});
		} catch (error) {
			await StorageDB.deleteOne({ key: phoneKey, 'object.email': email });
			if ((error as { code?: number }).code === 11000) {
				throw new ConflictError('A registration is already pending for this email');
			}
			throw error;
		}

		const emailSent = await sendRegistrationOtpEmail(email, otp);
		if (!emailSent) {
			throw new ServerError('Failed to send verification email');
		}
	}

	async resendRegistrationOtp(email: string): Promise<void> {
		const normalized = email.toLowerCase();
		const now = new Date();
		const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
		const otpHash = await bcrypt.hash(otp, 10);
		const cutoff = new Date(now.getTime() - REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS * 1000);
		const pending = await PendingRegistrationDB.findOneAndUpdate(
			{ email: normalized, status: 'pending', lastSentAt: { $lte: cutoff } },
			{
				$set: {
					otpHash,
					otpExpiresAt: new Date(now.getTime() + REGISTRATION_OTP_TTL_SECONDS * 1000),
					attempts: 0,
					lastSentAt: now,
					expireAt: new Date(now.getTime() + PENDING_REGISTRATION_TTL_SECONDS * 1000),
				},
			},
			{ new: true }
		);
		if (!pending) {
			const existing = await PendingRegistrationDB.findOne({ email: normalized });
			if (!existing) {
				throw new NotFoundError('No pending registration was found for this email');
			}
			if (existing.status !== 'pending') {
				throw new ConflictError('Registration is being finalized');
			}
			const wait = Math.ceil(
				REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS -
					(now.getTime() - existing.lastSentAt.getTime()) / 1000
			);
			throw new TooManyRequestsError(`Please wait ${Math.max(1, wait)}s before requesting another code`);
		}
		await StorageDB.updateOne(
			{ key: this.registrationPhoneKey(pending.phone), 'object.email': normalized },
			{ $set: { expireAt: pending.expireAt } }
		);

		const emailSent = await sendRegistrationOtpEmail(normalized, otp);
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

		if (pending.status !== 'pending') {
			throw new UnauthorizedError('Invalid or expired code');
		}

		if (pending.otpExpiresAt.getTime() <= Date.now()) {
			throw new UnauthorizedError('Code has expired; request a new one');
		}

		if (pending.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
			throw new UnauthorizedError('Too many incorrect attempts; request a new code');
		}

		const valid = await bcrypt.compare(otp, pending.otpHash);
		if (!valid) {
			await PendingRegistrationDB.updateOne(
				{ _id: pending._id, status: 'pending', otpHash: pending.otpHash },
				{ $inc: { attempts: 1 } }
			);
			throw new UnauthorizedError('Invalid code');
		}

		// Claim the pending record before creating either resource. Only one
		// concurrent verifier can move it out of `pending`, so an OTP is single-use.
		const claimed = await PendingRegistrationDB.findOneAndUpdate(
			{
				_id: pending._id,
				status: 'pending',
				otpHash: pending.otpHash,
				otpExpiresAt: { $gt: new Date() },
				attempts: { $lt: OTP_MAX_VERIFY_ATTEMPTS },
			},
			{ $set: { status: 'finalizing' } },
			{ new: true }
		).select('+passwordHash +otpHash');
		if (!claimed) {
			throw new UnauthorizedError('Invalid or expired code');
		}

		const existingAccount = await AccountDB.findOne({
			$or: [{ email: normalized }, { phone: claimed.phone }],
		});
		if (existingAccount) {
			await PendingRegistrationDB.deleteOne({ _id: claimed._id });
			await StorageDB.deleteOne({
				key: this.registrationPhoneKey(claimed.phone),
				'object.email': normalized,
			});
			throw new ConflictError('An account with this email or phone already exists');
		}

		const account = new AccountDB({
			name: claimed.name,
			email: claimed.email,
			phone: claimed.phone,
			countryCode: claimed.countryCode,
			password: claimed.passwordHash,
			role: claimed.accountType,
			status: 'verified',
			emailVerified: true,
			guideTrialEligible: claimed.accountType === 'guide',
			isActive: claimed.accountType !== 'guide',
		});
		account.$locals.skipPasswordHash = true;
		try {
			await account.save();
			if (claimed.accountType === 'guide') {
				const draft = claimed.guideDraft;
				if (!draft || draft.identityProofs.length !== 2) {
					throw new BadRequestError('The pending guide application is incomplete; request a new code');
				}
				await GuideService.upsertGuideProfile(
					account._id.toString(),
					{
						city: draft.city,
						type: draft.type,
						languages: draft.languages,
						pan: draft.pan,
						phone: claimed.phone,
					},
					{ profileImage: draft.profileImage, identityProofs: draft.identityProofs }
				);
				const activated = await AccountDB.updateOne(
					{ _id: account._id, isActive: false },
					{ $set: { isActive: true } }
				);
				if (activated.matchedCount !== 1) {
					throw new ServerError('Could not activate the completed guide registration');
				}
				account.isActive = true;
			}
		} catch (error) {
			await GuideDB.deleteOne({ accountId: account._id });
			await AccountDB.deleteOne({ _id: account._id });
			await PendingRegistrationDB.updateOne(
				{ _id: claimed._id, status: 'finalizing' },
				{
					$set: {
						status: 'pending',
						otpHash: await bcrypt.hash(randomInt(0, 1_000_000).toString(), 10),
						otpExpiresAt: new Date(),
						attempts: 0,
					},
				}
			);
			throw error;
		}

		await PendingRegistrationDB.deleteOne({ _id: claimed._id, status: 'finalizing' });
		await StorageDB.deleteOne({
			key: this.registrationPhoneKey(claimed.phone),
			'object.email': normalized,
		});

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
