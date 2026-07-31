import GuideService from '@services/guide';

import { contactInquirySchema } from '@/server/modules/guide/guide.schema';
import { clientIp, enforceRateLimit } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody, validateBody } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Same window and ceiling as the lead module's limiter, kept as a separate
 * bucket so traffic to one form cannot exhaust the other's allowance.
 */
const CONTACT_INQUIRY_LIMIT = {
	prefix: 'guide-contact-inquiry',
	windowSeconds: 60 * 60,
	max: 10,
};

/**
 * POST /api/guide/contact-inquiry — public, unauthenticated.
 *
 * Write-capable and unauthenticated, so it carries a limiter: one row per call
 * with nothing else to stop a script inserting them without bound. Keyed on IP
 * ONLY — the body is entirely attacker-supplied, so keying on any field in it
 * would hand out a fresh bucket per request and defeat the limit.
 */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	// Limiter before validation, as in the Express chain: an invalid body still
	// consumes quota and cannot be looped to bypass the limit.
	await enforceRateLimit(CONTACT_INQUIRY_LIMIT, clientIp(request));

	const data = validateBody(body, contactInquirySchema);
	const inquiry = await GuideService.createContactInquiry(data);

	return respond({
		status: 201,
		data: { message: 'Contact inquiry submitted successfully', inquiry },
	});
});
