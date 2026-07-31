import AuthService from '@services/auth';

import { forgotPasswordSchema } from '@/server/modules/session/session.schema';
import { enforceRateLimit, FORGOT_PASSWORD_LIMIT, ipEmailKey } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/session/forgot-password
 *
 * The response is deliberately identical whether or not the address exists —
 * anything else turns this into an account-enumeration oracle.
 */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	await enforceRateLimit(FORGOT_PASSWORD_LIMIT, ipEmailKey(request, body));

	const data = validateBody(body, forgotPasswordSchema);
	await AuthService.forgotPassword(data.email);

	return respond({
		status: 200,
		data: {
			message: 'If an account with that email exists, a password reset code has been sent.',
		},
	});
});
