import {
	JWT_ACCESS_EXPIRE,
	JWT_ACCESS_SECRET,
	JWT_REFRESH_EXPIRE,
	JWT_REFRESH_SECRET,
} from '@config/const';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface JWTPayload {
	userId: string;
	role: 'tourist' | 'guide' | 'admin';
	email: string;
	name: string;
	tokenVersion: number;
}

export interface RefreshPayload {
	userId: string;
	tokenVersion: number;
}

function normalizeExpire(value: string): string {
	return value.replace('minutes', 'm').replace('minute', 'm');
}

class JWTService {
	generateAccessToken(payload: JWTPayload): string {
		return jwt.sign(payload, JWT_ACCESS_SECRET, {
			expiresIn: normalizeExpire(String(JWT_ACCESS_EXPIRE)),
		} as SignOptions);
	}

	generateRefreshToken(payload: RefreshPayload): string {
		return jwt.sign(payload, JWT_REFRESH_SECRET, {
			expiresIn: normalizeExpire(String(JWT_REFRESH_EXPIRE)),
		} as SignOptions);
	}

	verifyAccessToken(token: string): JWTPayload | null {
		try {
			return jwt.verify(token, JWT_ACCESS_SECRET) as JWTPayload;
		} catch {
			return null;
		}
	}

	verifyRefreshToken(token: string): RefreshPayload | null {
		try {
			return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshPayload;
		} catch {
			return null;
		}
	}

	// Back-compat shims
	generateToken(payload: JWTPayload): string {
		return this.generateAccessToken(payload);
	}
	verifyToken(token: string): JWTPayload | null {
		return this.verifyAccessToken(token);
	}
}

export default new JWTService();
