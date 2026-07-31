import ContactInquiryDB from '@mongo/repo/ContactInquiry';
import { BadRequestError } from 'node-be-utilities';

import { createContactInquirySchema } from '@/server/modules/lead/lead.schema';
import { clientIp, enforceRateLimit } from '@/server/http/limiters';
import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * This is the only unauthenticated write endpoint on the lead module: no
 * session, no captcha, one row inserted per call. Without a limiter a single
 * client can insert unbounded rows into `contactinquiries`, which both grows the
 * collection without bound and buries genuine enquiries in the admin queue. Ten
 * per hour per IP is far above what a real visitor needs (the form is submitted
 * once) and low enough to make scripted flooding pointless.
 *
 * Keyed on IP alone rather than IP+email, unlike the session limiters: the email
 * here is attacker-chosen free text, so including it would let one client rotate
 * it to get a fresh bucket per request.
 */
const CONTACT_LIMIT = { prefix: 'lead-contact', windowSeconds: 60 * 60, max: 10 };

/** POST /api/lead/contact — public contact form. */
export const POST = createHandler(async (request) => {
	const body = await readJsonBody(request);

	await enforceRateLimit(CONTACT_LIMIT, clientIp(request));

	// This module reports only the FIRST issue's message, with no path prefix —
	// unlike every other validator in the app, which joins all of them. Kept as
	// it was: the message is rendered verbatim by the form.
	const result = createContactInquirySchema.safeParse(body);
	if (!result.success) {
		throw new BadRequestError(result.error.issues[0].message);
	}
	const data = result.data;

	const inquiry = await ContactInquiryDB.create({
		fullName: data.fullName,
		email: data.email,
		phoneNumber: data.phoneNumber,
		nationality: data.nationality,
		category: data.category,
		subject: data.subject,
		message: data.message,
		...(data.serviceName && { serviceName: data.serviceName }),
		status: 'pending',
	});

	return respond({
		status: 201,
		data: {
			id: inquiry._id,
			message: 'Contact inquiry submitted successfully. We will get back to you soon.',
		},
	});
});

/** GET /api/lead/contact — admin list, paginated. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const params = new URL(request.url).searchParams;

	const filter: Record<string, string> = {};
	const status = params.get('status');
	const category = params.get('category');
	if (status) filter.status = status;
	if (category) filter.category = category;

	const pageNum = parseInt(params.get('page') ?? '1', 10);
	const limitNum = parseInt(params.get('limit') ?? '10', 10);
	const skip = (pageNum - 1) * limitNum;

	const [inquiries, total] = await Promise.all([
		ContactInquiryDB.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
		ContactInquiryDB.countDocuments(filter),
	]);

	return respond({
		status: 200,
		data: {
			inquiries,
			pagination: {
				total,
				page: pageNum,
				limit: limitNum,
				totalPages: Math.ceil(total / limitNum),
			},
		},
	});
});
