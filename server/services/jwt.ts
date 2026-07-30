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

/**
 * Pin the signing algorithm on both sides.
 *
 * jsonwebtoken picks HS256 when signing with a string secret, but on the verify
 * side it will accept whatever the token's own `alg` header claims as long as
 * the key type fits. Naming the algorithm explicitly means the header is no
 * longer an input to that decision — a token presented as `none`, or as an
 * HMAC variant we never issue, is rejected on algorithm grounds before the
 * signature is even considered.
 *
 * This is defence-in-depth rather than a fix for a live hole: the classic
 * confusion attack needs an asymmetric public key sitting in the secret slot,
 * and both secrets here are symmetric strings. It costs nothing and removes the
 * failure mode entirely if a key type ever changes.
 */
const ALGORITHM = 'HS256' as const;

class JWTService {
	generateAccessToken(payload: JWTPayload): string {
		return jwt.sign(payload, JWT_ACCESS_SECRET, {
			expiresIn: normalizeExpire(String(JWT_ACCESS_EXPIRE)),
			algorithm: ALGORITHM,
		} as SignOptions);
	}

	generateRefreshToken(payload: RefreshPayload): string {
		return jwt.sign(payload, JWT_REFRESH_SECRET, {
			expiresIn: normalizeExpire(String(JWT_REFRESH_EXPIRE)),
			algorithm: ALGORITHM,
		} as SignOptions);
	}

	verifyAccessToken(token: string): JWTPayload | null {
		try {
			return jwt.verify(token, JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] }) as JWTPayload;
		} catch {
			return null;
		}
	}

	verifyRefreshToken(token: string): RefreshPayload | null {
		try {
			return jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: [ALGORITHM] }) as RefreshPayload;
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
