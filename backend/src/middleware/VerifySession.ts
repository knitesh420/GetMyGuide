import { Cookie } from '@config/const';
import { AccountDB } from '@mongo';
import JWTService, { JWTPayload } from '@services/jwt';
import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from 'node-be-utilities';

function extractToken(req: Request): string | undefined {
	// Cookie is the primary transport. Authorization header is accepted as a
	// fallback for non-browser clients (mobile apps, server-to-server, etc.).
	const cookieToken = req.cookies?.[Cookie.Auth];
	if (cookieToken) return cookieToken;

	const authHeader = req.headers.authorization;
	if (authHeader?.startsWith('Bearer ')) {
		return authHeader.substring(7);
	}
	return undefined;
}

/**
 * Verifies the access token from cookie (or Authorization header fallback),
 * checks that the token's version matches the user's current tokenVersion
 * (invalidation on logout / password reset), and attaches the payload to
 * req.locals.user. This is the single source of truth for "who is this
 * request" — never read auth state from anywhere else.
 */
export default async function VerifySession(req: Request, res: Response, next: NextFunction) {
	try {
		const token = extractToken(req);
		if (!token) {
			return next(new UnauthorizedError('Authentication token is required'));
		}

		const payload = JWTService.verifyAccessToken(token);
		if (!payload) {
			return next(new UnauthorizedError('Invalid or expired token'));
		}

		// Token-version check — ensures logouts / password resets invalidate
		// previously issued tokens without needing a blacklist.
		const user = await AccountDB.findById(payload.userId).select('tokenVersion isActive role');
		if (!user || !user.isActive) {
			return next(new UnauthorizedError('Account not available'));
		}
		if ((user.tokenVersion ?? 0) !== payload.tokenVersion) {
			return next(new UnauthorizedError('Session has been revoked'));
		}

		req.locals.user = payload;
		next();
	} catch (err) {
		next(err);
	}
}

export async function VerifySessionOptional(req: Request, _res: Response, next: NextFunction) {
	try {
		const token = extractToken(req);
		if (!token) return next();

		const payload = JWTService.verifyAccessToken(token);
		if (!payload) return next();

		const user = await AccountDB.findById(payload.userId).select('tokenVersion isActive');
		if (!user || !user.isActive) return next();
		if ((user.tokenVersion ?? 0) !== payload.tokenVersion) return next();

		req.locals.user = payload;
		next();
	} catch {
		next();
	}
}

export function VerifyMinLevel(minRole: 'tourist' | 'guide' | 'admin') {
	return (req: Request, _res: Response, next: NextFunction) => {
		const user = req.locals.user as JWTPayload | undefined;
		if (!user) {
			return next(new UnauthorizedError('User information not found'));
		}

		const roleHierarchy: Record<string, number> = {
			tourist: 1,
			guide: 5,
			admin: 10,
		};
		const userLevel = roleHierarchy[user.role] || 0;
		const required = roleHierarchy[minRole] || 0;

		if (userLevel < required) {
			return next(new ForbiddenError('Insufficient permissions'));
		}
		next();
	};
}
