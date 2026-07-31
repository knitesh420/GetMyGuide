import GuideService from '@services/guide';
import { BadRequestError } from 'node-be-utilities';

import { respond } from '@/server/http/respond';
import { createHandler, readJsonBody } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/guide/availability
 *
 * Note the gate is the session alone — no requireMinLevel. That matches the
 * Express route, which used VerifySession without a role check here.
 *
 * The body is hand-checked rather than validated with zod, again matching the
 * controller: it only asserts that unavailableDates is an array, and the same
 * BadRequestError message is preserved.
 */
export const PUT = createHandler(async (request) => {
	const user = await requireSession(request);

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const body = (await readJsonBody(request)) as { unavailableDates?: unknown } | undefined;
	const unavailableDates = body?.unavailableDates;

	if (!Array.isArray(unavailableDates)) {
		throw new BadRequestError('unavailableDates must be an array');
	}

	const profile = await GuideService.updateAvailability(user.userId, unavailableDates);

	return respond({ status: 200, data: profile });
});
