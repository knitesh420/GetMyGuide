/**
 * `/api/users` is an alias for `/api/user` — the Express router mounts the same
 * module at both spellings and the codebase uses both. The handlers live next
 * door; only the segment config has to be declared per-file, because Next reads
 * it off the route module itself rather than following re-exports.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { GET } from '../user/route';
