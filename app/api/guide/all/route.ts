import { getAllApprovedGuidesHandler } from '@/server/modules/guide/guide.handlers';
import { createHandler } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/guide/all — public directory of approved, membership-active guides. */
export const GET = createHandler(getAllApprovedGuidesHandler);
