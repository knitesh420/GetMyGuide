import { JWT_EXPIRE, JWT_SECRET } from '@config/const';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface JWTPayload {
	userId: string;
	role: string;
	email: string;
	name: string;
}

class JWTService {
	/**
	 * Generate a JWT token with user information
	 */
	generateToken(payload: JWTPayload): string {
		// Convert '3minutes' to '3m' format if needed
		const expiresInStr = String(JWT_EXPIRE).replace('minutes', 'm').replace('minute', 'm');

		return jwt.sign(
			payload,
			JWT_SECRET as string,
			{
				expiresIn: expiresInStr,
			} as SignOptions
		);
	}

	/**
	 * Verify and decode a JWT token
	 * Returns the payload if valid, null otherwise
	 */
	verifyToken(token: string): JWTPayload | null {
		try {
			const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;
			return decoded;
		} catch {
			return null;
		}
	}
}

export default new JWTService();
