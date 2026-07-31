import TouristService from '@services/tourist';
import { BadRequestError } from 'node-be-utilities';

import { touristProfileSchema } from '@/server/modules/tourist/tourist.schema';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody } from '@/server/http/route';
import { requireRole, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET/PUT /api/tourist/profile
 *
 * requireRole (exact membership), not requireMinLevel — a guide outranks a
 * tourist numerically but must not reach tourist profile endpoints, which is
 * exactly the distinction VerifyRole existed to make.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const profile = await TouristService.getTouristProfile(user.userId);

	return respond({ status: 200, data: profile });
});

export const PUT = createHandler(async (request) => {
	const user = await requireSession(request);
	requireRole(user, 'tourist', 'admin');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const data = await parseBody(request, touristProfileSchema);
	const profile = await TouristService.upsertTouristProfile(user.userId, data);

	return respond({ status: 200, data: profile });
});
