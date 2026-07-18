import { AccountDB } from '@mongo';
import AuthService from '@services/auth';

/**
 * Issue a real access token for an account of the given role.
 *
 * Several integration suites predate the authentication that now guards the
 * routes they exercise (`/upload-media` and the blog/package admin endpoints
 * were all open when their tests were written). Rather than each suite growing
 * its own copy of "sign up, promote the role, log in", they share this.
 *
 * These are genuine tokens from AuthService, not stubs — the point is to prove
 * the route works for a caller who really does hold that role, and still refuses
 * one who doesn't.
 */
export async function createAuthedUser(
	role: 'tourist' | 'guide' | 'admin',
	overrides: { email?: string; name?: string; phone?: string } = {}
): Promise<{ token: string; userId: string; email: string }> {
	const unique = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const email = overrides.email ?? `${unique}@example.com`;
	const password = 'TestPassword123!';

	// signup() always produces a tourist, so anything else is promoted afterwards.
	const created = await AuthService.signup({
		name: overrides.name ?? `Test ${role}`,
		email,
		phone: overrides.phone ?? `+1${Math.floor(1_000_000_000 + Math.random() * 8_999_999_999)}`,
		password,
	});

	if (role === 'tourist') {
		// login() refuses an unverified address; signup leaves it non_verified.
		await AccountDB.findByIdAndUpdate(created.user.id, { emailVerified: true });
		return { token: created.accessToken, userId: created.user.id, email };
	}

	await AccountDB.findByIdAndUpdate(created.user.id, {
		role,
		emailVerified: true,
		status: 'verified',
	});

	// Admins cannot log in with a password, so mint their token the same way the
	// OTP flow does rather than going through login().
	if (role === 'admin') {
		const account = await AccountDB.findById(created.user.id);
		const JWTService = (await import('@services/jwt')).default;
		const token = JWTService.generateAccessToken({
			userId: account!._id.toString(),
			role: 'admin',
			email: account!.email,
			name: account!.name,
			tokenVersion: account!.tokenVersion ?? 0,
		});
		return { token, userId: created.user.id, email };
	}

	const loggedIn = await AuthService.login({ email, password });
	return { token: loggedIn.accessToken, userId: created.user.id, email };
}

/** Supertest header helper: `.set(...authHeader(token))` */
export function authHeader(token: string): [string, string] {
	return ['Authorization', `Bearer ${token}`];
}
