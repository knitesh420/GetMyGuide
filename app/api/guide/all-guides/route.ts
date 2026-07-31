import { getAllApprovedGuidesHandler } from '@/server/modules/guide/guide.handlers';
import { createHandler } from '@/server/http/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/all-guides — alias of /api/guide/all.
 *
 * The frontend calls both spellings. They share one handler so they cannot
 * drift apart, exactly as the Express router pointed both at one controller.
 */
export const GET = createHandler(getAllApprovedGuidesHandler);
