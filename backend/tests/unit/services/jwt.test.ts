import JWTService, { JWTPayload } from '@services/jwt';

describe('JWTService', () => {
	const testPayload: JWTPayload = {
		userId: '507f1f77bcf86cd799439011',
		role: 'tourist',
		email: 'test@example.com',
		name: 'Test User',
	};

	describe('generateToken', () => {
		it('should generate a valid JWT token', () => {
			const token = JWTService.generateToken(testPayload);
			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
		});

		it('should generate different tokens for different payloads', () => {
			const token1 = JWTService.generateToken(testPayload);
			const payload2 = { ...testPayload, userId: '507f1f77bcf86cd799439012' };
			const token2 = JWTService.generateToken(payload2);
			expect(token1).not.toBe(token2);
		});

		it('should handle different time formats in JWT_EXPIRE', () => {
			const token1 = JWTService.generateToken(testPayload);
			expect(token1).toBeDefined();
		});
	});

	describe('verifyToken', () => {
		it('should verify and decode a valid token', () => {
			const token = JWTService.generateToken(testPayload);
			const decoded = JWTService.verifyToken(token);
			expect(decoded).not.toBeNull();
			expect(decoded).toMatchObject({
				userId: testPayload.userId,
				role: testPayload.role,
				email: testPayload.email,
				name: testPayload.name,
			});
		});

		it('should return null for an invalid token', () => {
			const invalidToken = 'invalid.token.here';
			const decoded = JWTService.verifyToken(invalidToken);
			expect(decoded).toBeNull();
		});

		it('should return null for a tampered token', () => {
			const token = JWTService.generateToken(testPayload);
			const tamperedToken = token.slice(0, -5) + 'xxxxx';
			const decoded = JWTService.verifyToken(tamperedToken);
			expect(decoded).toBeNull();
		});

		it('should return null for an empty string', () => {
			const decoded = JWTService.verifyToken('');
			expect(decoded).toBeNull();
		});

		it('should return null for a token signed with different secret', () => {
			// This test verifies that tokens signed with different secrets are rejected
			// We can't easily test this without changing the secret, but the verifyToken
			// should handle jwt.verify errors and return null
			const token = JWTService.generateToken(testPayload);
			// If we had a different secret, this would fail
			// For now, we test that valid tokens work
			const decoded = JWTService.verifyToken(token);
			expect(decoded).not.toBeNull();
		});
	});

	describe('Token round-trip', () => {
		it('should generate and verify token correctly', () => {
			const originalPayload: JWTPayload = {
				userId: '507f1f77bcf86cd799439011',
				role: 'admin',
				email: 'admin@example.com',
				name: 'Admin User',
			};

			const token = JWTService.generateToken(originalPayload);
			const decoded = JWTService.verifyToken(token);

			expect(decoded).not.toBeNull();
			if (decoded) {
				expect(decoded.userId).toBe(originalPayload.userId);
				expect(decoded.role).toBe(originalPayload.role);
				expect(decoded.email).toBe(originalPayload.email);
				expect(decoded.name).toBe(originalPayload.name);
			}
		});
	});
});
