import LocationService from '@services/location';
import { uploadBuffer } from '@utils/cloudinaryUpload';

import { validateIdString } from '@/server/http/id';
import { fileFor, parseBodyWithFiles } from '@/server/http/multipart';
import { respond } from '@/server/http/respond';
import { createHandler, validateBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';
import { locationUpdateSchema } from '@/server/modules/location/location.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/locations/:id
 *
 * Deliberately NOT id-validated: the public location page addresses a location
 * by slug, and the service accepts either. Running the id validator here would
 * 400 every slug URL on the site.
 */
export const GET = createHandler(async (request, { params }) => {
	const location = await LocationService.getById(params.id);

	return respond({ status: 200, data: location });
});

/**
 * Admin update. See the POST handler for why no MIME allow-list is imposed.
 *
 * A request with no file leaves the existing image alone rather than clearing
 * it — that is why the upload result is spread conditionally instead of being
 * passed through as `image: undefined`, which would unset the field.
 */
const update = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);

	const { body, files } = await parseBodyWithFiles(request, [{ field: 'image', maxCount: 1 }]);
	const data = validateBody(body, locationUpdateSchema);

	const file = fileFor({ files }, 'image');
	const image = file ? await uploadBuffer(file.buffer, 'locations') : undefined;

	const location = await LocationService.update(
		id,
		{ ...data, ...(image ? { image } : {}) },
		user.userId
	);

	return respond({ status: 200, data: location });
});

export const PATCH = update;

/** PUT is an alias for PATCH — the admin panel's update thunk uses PUT. */
export const PUT = update;

/** Soft delete: packages and bookings may still reference this location by name. */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const result = await LocationService.remove(id, user.userId);

	return respond({ status: 200, data: result });
});
