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
		paymentStatus: {
			type: String,
			enum: ['pending', 'success', 'failed', 'na'],
			default: 'na',
		},
		unavailableDates: {
			type: [Date],
			default: [],
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

	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password as string, salt);
});

// Instance method to verify password
AccountSchema.methods.verifyPassword = async function (password: string): Promise<boolean> {
	return bcrypt.compare(password, this.password as string);
};

const AccountDB = mongoose.model<IAccount>('Account', AccountSchema);

export default AccountDB;
