import AuthService from '@services/auth';

import { registerSendOtpSchema } from '@/server/modules/session/session.schema';
import { enforceRateLimit, ipEmailKey, REGISTER_OTP_SEND_LIMIT } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/session/register/send-otp
 *
 * Creates a PendingRegistration and emails a code; no Account exists until the
 * code is verified.
 */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	await enforceRateLimit(REGISTER_OTP_SEND_LIMIT, ipEmailKey(request, body));

	const data = validateBody(body, registerSendOtpSchema);
	await AuthService.sendRegistrationOtp(data);

	return respond({
		status: 200,
		data: { message: 'A verification code has been sent to your email.' },
	});
});
