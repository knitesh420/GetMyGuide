import RefundService from '@services/refund';

import { validateId } from '@/server/http/id';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/refund/:id
 *
 * No role gate — a tourist or guide may read their own request. The session
 * payload is passed to the service, which decides whether this caller is
 * entitled to this row; passing only the id would drop that check and let
 * anyone read anyone's refund.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);

	const id = validateId(params.id);
	const result = await RefundService.getById(id, user);

	return respond({ status: 200, data: result });
});
