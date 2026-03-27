import { Types } from 'mongoose';

export const testUser = {
	name: 'Test User',
	email: 'test@example.com',
	phone: '+1234567890',
	password: 'password123',
	role: 'tourist' as const,
};

export const testGuide = {
	name: 'Test Guide',
	email: 'guide@example.com',
	phone: '+1234567891',
	password: 'password123',
	role: 'guide' as const,
};

export const testAdmin = {
	name: 'Test Admin',
	email: 'admin@example.com',
	phone: '+1234567892',
	password: 'password123',
	role: 'admin' as const,
};

export const testUserId = new Types.ObjectId().toString();
export const testAdminId = new Types.ObjectId().toString();

export const validObjectId = new Types.ObjectId().toString();
export const invalidObjectId = 'invalid-id';

export const testJWTSecret = 'test-jwt-secret';

export const testLoginData = {
	email: 'test@example.com',
	password: 'password123',
};

export const testSignupData = {
	name: 'New User',
	email: 'newuser@example.com',
	phone: '+1234567892',
	password: 'password123',
};

export const testForgotPasswordData = {
	email: 'test@example.com',
};

export const testResetPasswordData = {
	token: 'valid-reset-token',
	password: 'newpassword123',
};
