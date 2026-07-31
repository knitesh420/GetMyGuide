import Package from '@modules/package/package.schema';
import uploadToCloudinary from '@utils/cloudinaryUpload';
import { BadRequestError } from 'node-be-utilities';

import { filesFor, parseBodyWithFiles } from '@/server/http/multipart';
import { respond, respondJson } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';
import { parseCreatePackage } from '@/server/modules/package/package.input';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The package module answers `{ success, data }` — and `{ success, count, data }`
 * for the listings — rather than the flattened `Respond()` envelope the rest of
 * the API uses. That is inconsistent, and it is the contract the admin panel and
 * the tours pages decode, so the payload is nested here on purpose.
 *
 * `respond()` spreads its payload and then appends `success: true`; writing
 * `success` first inside the payload therefore reproduces the Express body with
 * its key order intact, since a duplicate key keeps its first position.
 */

/** GET /api/package — public listing, active packages only. */
export const GET = createHandler(async (request) => {
	const url = new URL(request.url);
	const query: Record<string, unknown> = { status: 'active' };

	if (url.searchParams.get('featured') === 'true') {
		query.featured = true;
	}

	// Clamped rather than trusted: an unbounded client-supplied limit is a cheap
	// way to force a full-collection scan and response.
	const rawLimit = Number(url.searchParams.get('limit'));
	const limit =
		Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 0;

	let cursor = Package.find(query).sort({ createdAt: -1 });
	if (limit > 0) {
		cursor = cursor.limit(limit);
	}
	const packages = await cursor;

	return respond({
		status: 200,
		data: { success: true, count: packages.length, data: packages },
	});
});

/**
 * POST /api/package — admin creates a package.
 *
 * The step order is the Express middleware chain and is load-bearing: multer
 * parsed the body, THEN the validator rejected bad data, and only then did the
 * controller check that images were attached. A submission that is both invalid
 * and image-less therefore reports the validation problem, not the missing
 * image, and the admin panel surfaces whichever message it is given.
 *
 * Each image goes to Cloudinary before the document is written: a package that
 * exists with no images renders as a broken card on the tours page, so an upload
 * failure must fail the whole create.
 *
 * The multer parser behind this route has no `fileFilter` and no size limit, so
 * no MIME allow-list is imposed here either.
 */
export const POST = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const { body, files } = await parseBodyWithFiles(request, [{ field: 'images', maxCount: 10 }]);

	const parsed = parseCreatePackage(body);
	if (!parsed.ok) {
		throw new BadRequestError(parsed.message);
	}

	const images = filesFor({ files }, 'images');
	if (!images.length) {
		return respondJson({
			status: 400,
			body: { success: false, message: 'Package images are required' },
		});
	}

	const uploadedImages: { url: string; publicId: string }[] = [];
	for (const file of images) {
		const result = await uploadToCloudinary(file.buffer, 'packages');
		uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
	}

	const pkg = await Package.create({ ...parsed.data, images: uploadedImages });

	return respond({ status: 201, data: { success: true, data: pkg } });
});
