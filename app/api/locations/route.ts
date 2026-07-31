import LocationService from '@services/location';
import { uploadBuffer } from '@utils/cloudinaryUpload';

import { fileFor, parseBodyWithFiles } from '@/server/http/multipart';
import { respond } from '@/server/http/respond';
import { createHandler, parseQuery, validateBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';
import {
	locationCreateSchema,
	locationListQuerySchema,
} from '@/server/modules/location/location.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/locations
 *
 * Public listing. The service hard-filters to `isActive: true`, so an admin can
 * withdraw a location without it staying readable here.
 *
 * The payload is a bare array and `Respond()` SPREADS its payload, so the wire
 * format is index-keyed (`{"0":{…},"1":{…},"success":true}`). That is what the
 * frontend's unwrap() already decodes — wrapping it in `{ data: [...] }` here
 * would be cleaner and would silently break every caller.
 */
export const GET = createHandler(async (request) => {
	const { city, popular, search } = parseQuery(request, locationListQuerySchema);
	const locations = await LocationService.getAll({ city, popular, search });

	return respond({ status: 200, data: locations });
});

/**
 * POST /api/locations — admin creates a location.
 *
 * Order matters and matches the Express chain: session, then role, then body.
 * An unauthenticated caller is refused before the upload is read, so a large
 * body can't be used to make an anonymous request expensive.
 *
 * The multer parser behind this route has no `fileFilter` and no size limit, so
 * no MIME allow-list is imposed here either. The 10 MB default from
 * `parseMultipart` is the one difference, and it cannot be observed on Vercel:
 * the platform rejects bodies over 4.5 MB before the function is invoked.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { body, files } = await parseBodyWithFiles(request, [{ field: 'image', maxCount: 1 }]);
	const data = validateBody(body, locationCreateSchema);

	const file = fileFor({ files }, 'image');
	const image = file ? await uploadBuffer(file.buffer, 'locations') : undefined;

	const location = await LocationService.create(
		{ ...data, ...(image ? { image } : {}) },
		user.userId
	);

	return respond({ status: 201, data: location });
});
