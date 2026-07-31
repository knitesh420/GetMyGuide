/** Alias of `/api/locations/:id` — see ../route.ts. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { DELETE, GET, PATCH, PUT } from '../../locations/[id]/route';
