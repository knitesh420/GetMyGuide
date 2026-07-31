import PaymentService from '@services/payment';
import { BadRequestError } from 'node-be-utilities';

import { webhookSchema } from '@/server/modules/payment/payment.schema';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/webhook — Razorpay webhook receiver.
 *
 * No session: this is secured by HMAC signature verification, which is why the
 * raw bytes matter so much. `request.text()` returns exactly what Razorpay
 * sent; the signature is computed over those bytes, so the body must be read
 * ONCE, as text, and only then parsed. Re-serialising the parsed object and
 * signing that would produce a different digest whenever key order or unicode
 * escaping differed — the classic way this breaks, and it breaks silently, as
 * "webhook rejected" rather than an error anyone sees.
 *
 * Order of checks is preserved from the Express chain: body SHAPE is validated
 * before the signature. Verifying the signature first would arguably be better,
 * but changing it would change which failure a malformed delivery reports, so
 * it is left as production has it.
 *
 * Both headers are mandatory. x-razorpay-event-id in particular is what makes
 * retry-deduplication possible — Razorpay carries the event identifier there,
 * never in the body — so a delivery without it cannot be processed safely.
 */
export const POST = createHandler(async (request) => {
	// Read the raw bytes ONCE. Everything below works from this.
	const rawText = await request.text();
	const rawBody = Buffer.from(rawText, 'utf8');

	let parsed: unknown;
	try {
		parsed = JSON.parse(rawText);
	} catch {
		parsed = undefined;
	}

	// Shape check first, matching the Express middleware order. This validator
	// joins bare messages with no field prefix, unlike most of the app.
	const validation = webhookSchema.safeParse(parsed);
	if (!validation.success) {
		throw new BadRequestError(validation.error.issues.map((i) => i.message).join(', '));
	}

	const signature = request.headers.get('x-razorpay-signature');
	if (!signature) {
		throw new BadRequestError('Missing x-razorpay-signature header');
	}

	const eventId = request.headers.get('x-razorpay-event-id');
	if (!eventId) {
		throw new BadRequestError('Missing x-razorpay-event-id header');
	}

	const isValid = PaymentService.verifyWebhookSignature(rawBody, signature);
	if (!isValid) {
		throw new BadRequestError('Invalid webhook signature');
	}

	const result = await PaymentService.handleWebhookEvent(validation.data, eventId);

	return respond({ status: 200, data: result });
});
