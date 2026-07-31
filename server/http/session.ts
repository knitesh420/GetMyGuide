import { Cookie } from '@config/const';
import { AccountDB } from '@mongo';
import JWTService, { JWTPayload } from '@services/jwt';
import { ForbiddenError, UnauthorizedError } from 'node-be-utilities';

/**
 * Next-native port of `server/middleware/VerifySession.ts`.
 *
 * Same three checks, same order, same error messages — this is the single
 * source of truth for "who is this request", and it must stay behaviourally
 * identical to the Express version while both exist side by side:
 *
 *   1. token present (cookie first, Bearer header as fallback)
 *   2. token verifies
 *   3. account exists, is active, and its tokenVersion matches the token's
 *      (that last check is what makes logout and password-reset invalidate
 *      previously issued tokens without a blacklist)
 *
 * Throws instead of calling next(err); the route wrapper turns the throw into
 * the same JSON error the Express error handler produced.
 */

function extractToken(request: Request): string | undefined {
	// Cookie is the primary transport. Authorization header is accepted as a
	// fallback for non-browser clients (mobile apps, server-to-server, etc.).
	const cookieHeader = request.headers.get('cookie');
	if (cookieHeader) {
		for (const part of cookieHeader.split(';')) {
			const index = part.indexOf('=');
			if (index === -1) continue;
			const name = part.slice(0, index).trim();
			if (name === Cookie.Auth) {
				return decodeURIComponent(part.slice(index + 1).trim());
			}
		}
	}

	const authHeader = request.headers.get('authorization');
	if (authHeader?.startsWith('Bearer ')) {
		return authHeader.substring(7);
	}

	return undefined;
}

/** Read a named cookie off the request (used for the refresh token). */
export function readCookie(request: Request, name: string): string | undefined {
	const cookieHeader = request.headers.get('cookie');
	if (!cookieHeader) return undefined;

	for (const part of cookieHeader.split(';')) {
		const index = part.indexOf('=');
		if (index === -1) continue;
		if (part.slice(0, index).trim() === name) {
			return decodeURIComponent(part.slice(index + 1).trim());
		}
	}

	return undefined;
}

/** Verify the caller's session, or throw UnauthorizedError. */
export async function requireSession(request: Request): Promise<JWTPayload> {
	const token = extractToken(request);
	if (!token) {
		throw new UnauthorizedError('Authentication token is required');
	}

	const payload = JWTService.verifyAccessToken(token);
	if (!payload) {
		throw new UnauthorizedError('Invalid or expired token');
	}

	const user = await AccountDB.findById(payload.userId).select('tokenVersion isActive role');
	if (!user || !user.isActive) {
		throw new UnauthorizedError('Account not available');
	}
	if ((user.tokenVersion ?? 0) !== payload.tokenVersion) {
		throw new UnauthorizedError('Session has been revoked');
	}

	return payload;
}

/** Session if present and valid, otherwise undefined. Never throws. */
export async function optionalSession(request: Request): Promise<JWTPayload | undefined> {
	try {
		return await requireSession(request);
	} catch {
		return undefined;
	}
}

const ROLE_HIERARCHY: Record<string, number> = {
	tourist: 1,
	guide: 5,
	admin: 10,
};

/** Hierarchical check — higher roles pass. Port of VerifyMinLevel. */
export function requireMinLevel(user: JWTPayload | undefined, minRole: 'tourist' | 'guide' | 'admin'): void {
	if (!user) {
		throw new UnauthorizedError('User information not found');
	}

	const userLevel = ROLE_HIERARCHY[user.role] || 0;
	const required = ROLE_HIERARCHY[minRole] || 0;

	if (userLevel < required) {
		throw new ForbiddenError('Insufficient permissions');
	}
}

/**
 * Exact-membership check — port of VerifyRole.
 *
 * Unlike requireMinLevel this does NOT let higher roles through, which is
 * deliberate: a guide (level 5) must not reach tourist booking endpoints even
 * though 5 > 1, and vice-versa.
 */
export function requireRole(
	user: JWTPayload | undefined,
	...allowedRoles: Array<'tourist' | 'guide' | 'admin'>
): void {
	if (!user) {
		throw new UnauthorizedError('User information not found');
	}
	if (!allowedRoles.includes(user.role)) {
		throw new ForbiddenError(
			'Unauthorized access: this action is not permitted for your account type'
		);
	}
}
