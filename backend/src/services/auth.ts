import { randomBytes } from 'crypto';
import { ConflictError, NotFoundError, ServerError, UnauthorizedError } from 'node-be-utilities';
import { AccountDB, StorageDB } from '@mongo';
import { sendAdminOtpEmail, sendPasswordResetEmail } from '@provider/email';
import JWTService, { JWTPayload } from '@services/jwt';

interface SignupData {
	name: string;
	email: string;
	phone: string;
	password: string;
	role?: 'tourist' | 'guide' | 'admin';
}

interface LoginData {
	email: string;
	password: string;
}

interface AuthResponse {
	token: string;
	user: {
		id: string;
		name: string;
		email: string;
		phone: string;
		role: string;
		status: string;
	};
}

class AuthService {
	/**
	 * Register a new user
	 */
	async signup(data: SignupData): Promise<AuthResponse> {
		// Check if email already exists
		const existingUser = await AccountDB.findOne({ email: data.email.toLowerCase() });
		if (existingUser) {
			throw new ConflictError('User with this email already exists');
		}

		// Create new user
		const user = await AccountDB.create({
			name: data.name,
			email: data.email.toLowerCase(),
			phone: data.phone,
			password: data.password, // Will be hashed by pre-save hook
			role: data.role || 'tourist',
			status: 'non_verified',
			isActive: true,
		});

		// Generate JWT token
		const payload: JWTPayload = {
			userId: user._id.toString(),
			role: user.role,
			email: user.email,
			name: user.name,
		};
		const token = JWTService.generateToken(payload);

		return {
			token,
			user: {
				id: user._id.toString(),
				name: user.name,
				email: user.email,
				phone: user.phone,
				role: user.role,
				status: user.status,
			},
		};
	}

	/**
	 * Login with email and password
	 */
	async login(data: LoginData): Promise<AuthResponse> {
		// Find user by email and include password field
		const user = await AccountDB.findOne({ email: data.email.toLowerCase() }).select('+password');
		if (!user) {
			throw new UnauthorizedError('Invalid email or password');
		}

		// Verify password
		const isPasswordValid = await user.verifyPassword(data.password);
		if (!isPasswordValid) {
			throw new UnauthorizedError('Invalid email or password');
		}

		// Check if user is active
		if (!user.isActive) {
			throw new UnauthorizedError('Account is deactivated');
		}

		// Generate JWT token
		const payload: JWTPayload = {
			userId: user._id.toString(),
			role: user.role,
			email: user.email,
			name: user.name,
		};
		const token = JWTService.generateToken(payload);

		return {
			token,
			user: {
				id: user._id.toString(),
				name: user.name,
				email: user.email,
				phone: user.phone,
				role: user.role,
				status: user.status,
			},
		};
	}

	/**
	 * Generate password reset token and send email
	 */
	async forgotPassword(email: string): Promise<void> {
		const user = await AccountDB.findOne({ email: email.toLowerCase() });
		if (!user) {
			// Don't reveal if user exists for security
			return;
		}

		// Generate reset token
		const resetToken = randomBytes(32).toString('hex');

		// Store reset token in StorageDB with 20 minutes expiry
		await StorageDB.setString(resetToken, user._id.toString());

		// Send password reset email with a proper reset URL
		const resetBaseUrl =
			process.env.PASSWORD_RESET_BASE_URL ?? 'http://localhost:5173/reset-password';
		const emailSent = await sendPasswordResetEmail(user.email, resetToken, resetBaseUrl);
		if (!emailSent) {
			throw new ServerError('Failed to send password reset email');
		}
	}

	/**
	 * Send OTP to admin email for login
	 */
	async sendLoginOtp(email: string): Promise<void> {
		const user = await AccountDB.findOne({ email: email.toLowerCase() });
		if (!user) {
			throw new UnauthorizedError('Invalid email or not an admin account');
		}

		if (user.role !== 'admin') {
			throw new UnauthorizedError('Invalid email or not an admin account');
		}

		if (!user.isActive) {
			throw new UnauthorizedError('Account is deactivated');
		}

		// Generate 6-digit OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();

		// Store OTP in StorageDB (20 min TTL by default)
		await StorageDB.setString('admin-otp:' + email.toLowerCase(), otp);

		// Send OTP email
		const emailSent = await sendAdminOtpEmail(user.email, otp);
		if (!emailSent) {
			throw new ServerError('Failed to send OTP email');
		}
	}

	/**
	 * Login admin with OTP
	 */
	async loginWithOtp(email: string, otp: string): Promise<AuthResponse> {
		const user = await AccountDB.findOne({ email: email.toLowerCase() });
		if (!user) {
			throw new UnauthorizedError('Invalid email or OTP');
		}

		if (user.role !== 'admin') {
			throw new UnauthorizedError('Invalid email or OTP');
		}

		if (!user.isActive) {
			throw new UnauthorizedError('Account is deactivated');
		}

		// Verify OTP
		const storedOtp = await StorageDB.getString('admin-otp:' + email.toLowerCase());
		if (!storedOtp || storedOtp !== otp) {
			throw new UnauthorizedError('Invalid or expired OTP');
		}

		// Delete used OTP
		await StorageDB.deleteOne({ key: 'admin-otp:' + email.toLowerCase() });

		// Generate JWT token
		const payload: JWTPayload = {
			userId: user._id.toString(),
			role: user.role,
			email: user.email,
			name: user.name,
		};
		const token = JWTService.generateToken(payload);

		return {
			token,
			user: {
				id: user._id.toString(),
				name: user.name,
				email: user.email,
				phone: user.phone,
				role: user.role,
				status: user.status,
			},
		};
	}

	/**
	 * Reset password using reset token
	 */
	async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
		// Get user ID from reset token
		const userId = await StorageDB.getString(token);
		if (!userId) {
			throw new UnauthorizedError('Invalid or expired reset token');
		}

		// Find user
		const user = await AccountDB.findById(userId).select('+password');
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Update password (will be hashed by pre-save hook)
		user.password = newPassword;
		await user.save();

		// Delete reset token
		await StorageDB.deleteOne({ key: token });

		// Generate new JWT token
		const payload: JWTPayload = {
			userId: user._id.toString(),
			role: user.role,
			email: user.email,
			name: user.name,
		};
		const jwtToken = JWTService.generateToken(payload);

		return {
			token: jwtToken,
			user: {
				id: user._id.toString(),
				name: user.name,
				email: user.email,
				phone: user.phone,
				role: user.role,
				status: user.status,
			},
		};
	}
}

export default new AuthService();
