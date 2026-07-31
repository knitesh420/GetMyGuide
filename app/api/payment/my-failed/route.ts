import PaymentService from '@services/payment';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payment/my-failed
 *
 * The signed-in user's own unsuccessful payments. Any role — a guide sees
 * declined membership fees, a tourist sees declined bookings — so there is
 * deliberately no role gate, only a session. Scoping is by the session's userId,
 * never a client-supplied one.
 */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);

	const result = await PaymentService.listMyFailedPayments(user.userId);

	// respond() spreads its payload onto the response root, so a bare array
	// would serialise as {0:…, 1:…}. Wrap it, as every other list route does.
	return respond({ status: 200, data: { data: result } });
});
