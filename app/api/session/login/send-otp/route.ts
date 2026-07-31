import AuthService from '@services/auth';

import { sendOtpSchema } from '@/server/modules/session/session.schema';
import { enforceRateLimit, ipEmailKey, OTP_SEND_LIMIT } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/session/login/send-otp — admin OTP login.
 *
 * Responds identically regardless of whether the address belongs to an admin,
 * to avoid disclosing which accounts are privileged.
 */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	await enforceRateLimit(OTP_SEND_LIMIT, ipEmailKey(request, body));

	const data = validateBody(body, sendOtpSchema);
	await AuthService.sendLoginOtp(data.email);

	return respond({
		status: 200,
		data: { message: 'If this email is registered as admin, an OTP has been sent' },
	});
});
