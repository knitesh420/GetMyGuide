import cloudinary from '@config/cloudinary';
import Package from '@modules/package/package.schema';
import uploadToCloudinary from '@utils/cloudinaryUpload';
import { BadRequestError } from 'node-be-utilities';

import { filesFor, parseBodyWithFiles } from '@/server/http/multipart';
import { respond, respondJson } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';
import { parseUpdatePackage, toPackageObjectId } from '@/server/modules/package/package.input';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A malformed id is a client error, not a missing resource — 400, matching what
 * the shared id validator returns for every other module's `:id` routes.
 * These two replies sit outside the `Respond()` envelope, as the Express
 * controller's did; see respondJson() for why that matters.
 */
const badId = () =>
	respondJson({ status: 400, body: { success: false, message: 'Invalid ID' } });

const notFound = () =>
	respondJson({ status: 404, body: { success: false, message: 'Package not found' } });

/**
 * GET /api/package/:id — public, and therefore active packages only.
 *
 * The `status: 'active'` filter is not cosmetic: without it a package an admin
 * had deliberately withdrawn stayed fully readable, price and description
 * included, to anyone who knew or guessed its id. Admin reads are unaffected —
 * the admin panel loads from /package/admin/all and edits from that row.
 */
export const GET = createHandler(async (_request, { params }) => {
	const packageId = toPackageObjectId(params.id);
	if (!packageId) return badId();

	const pkg = await Package.findOne({ _id: packageId, status: 'active' });
	if (!pkg) return notFound();

	return respond({ status: 200, data: { success: true, data: pkg } });
});

/**
 * PATCH /api/package/:id — admin update.
 *
 * New images are APPENDED to the existing ones rather than replacing them, and
 * a request with no files leaves the current set alone.
 */
export const PATCH = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	// Body before id, because that is the Express chain: multer and the validator
	// were middleware, and the id check lived in the controller behind them. An
	// invalid body sent to a malformed id therefore reports the validation
	// problem, not "Invalid ID".
	const { body, files } = await parseBodyWithFiles(request, [{ field: 'images', maxCount: 10 }]);

	const parsed = parseUpdatePackage(body);
	if (!parsed.ok) {
		throw new BadRequestError(parsed.message);
	}

	const packageId = toPackageObjectId(params.id);
	if (!packageId) return badId();

	const existingPackage = await Package.findById(packageId);
	if (!existingPackage) return notFound();

	let images: unknown = existingPackage.images || [];

	const uploads = filesFor({ files }, 'images');
	if (uploads.length) {
		const uploadedImages: { url: string; publicId: string }[] = [];
		for (const file of uploads) {
			const result = await uploadToCloudinary(file.buffer, 'packages');
			uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
		}
		images = [...(existingPackage.images || []), ...uploadedImages];
	}

	const updatedPackage = await Package.findByIdAndUpdate(
		packageId,
		{ $set: { ...parsed.data, images } },
		{ new: true, runValidators: true }
	);

	return respond({ status: 200, data: { success: true, data: updatedPackage } });
});

/**
 * DELETE /api/package/:id
 *
 * The document goes first, then its Cloudinary assets. The reverse order made a
 * Cloudinary outage destructive-but-incomplete: images destroyed, a later
 * destroy call throws, and the package document survives — a live package whose
 * images all 404. This way the worst case is an orphaned asset, which costs
 * storage and breaks nothing.
 */
export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const packageId = toPackageObjectId(params.id);
	if (!packageId) return badId();

	const pkg = await Package.findById(packageId);
	if (!pkg) return notFound();

	await Package.findByIdAndDelete(packageId);

	for (const image of pkg.images) {
		try {
			await cloudinary.uploader.destroy(image.publicId);
		} catch {
			// Best-effort: the package is already gone, so a failed asset cleanup
			// must not turn a successful delete into a 500.
		}
	}

	return respond({
		status: 200,
		data: { success: true, message: 'Package deleted successfully' },
	});
});
