import { RAZORPAY_API_KEY } from '@config/const';

import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/key — the Razorpay *publishable* key id.
 *
 * Public and unauthenticated, as in Express. This is the key the checkout script
 * needs in the browser; it is not the secret, which never leaves the server.
 */
export const GET = createHandler(async () => {
	return respond({ status: 200, data: { key: RAZORPAY_API_KEY } });
});
