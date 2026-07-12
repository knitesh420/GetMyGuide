import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import IAccount from '../types/account';

const AccountSchema = new mongoose.Schema<IAccount>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
		},
		countryCode: {
			type: String,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			select: false, // Don't include password in queries by default
		},
		role: {
			type: String,
			enum: ['tourist', 'guide', 'admin'],
			default: 'tourist',
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		status: {
			type: String,
			enum: ['non_verified', 'verified'],
			default: 'non_verified',
		},
		// Distinct from `status` above, which today also drives guide public-listing
		// visibility elsewhere — kept separate so email verification can never
		// accidentally change that. True once the account owner has proven control
		// of their inbox (registration OTP, or a completed password reset).
		emailVerified: {
			type: Boolean,
			default: false,
		},
		paymentStatus: {
			type: String,
			enum: ['pending', 'success', 'failed', 'na'],
			default: 'na',
		},
		unavailableDates: {
			type: [Date],
			default: [],
		},
		tokenVersion: {
			type: Number,
			default: 0,
		},
		// Soft-delete marker. Field only — intentionally NOT enforced by query
		// middleware here, so the auth/login query paths stay byte-for-byte
		// unchanged. Enforce in service logic when an account is deactivated.
		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

// Hash password before saving
AccountSchema.pre('save', async function () {
	if (!this.isModified('password')) {
		return;
	}

	// Set by the registration-OTP-verify flow when it hands us a password that
	// is ALREADY bcrypt-hashed (it was hashed at rest in PendingRegistration).
	// Without this guard we'd hash an already-hashed value, permanently
	// breaking login for every account created that way.
	if (this.$locals?.skipPasswordHash) {
		return;
	}

	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password as string, salt);
});

// Instance method to verify password
AccountSchema.methods.verifyPassword = async function (password: string): Promise<boolean> {
	return bcrypt.compare(password, this.password as string);
};

const AccountDB = mongoose.model<IAccount>('Account', AccountSchema);

export default AccountDB;
