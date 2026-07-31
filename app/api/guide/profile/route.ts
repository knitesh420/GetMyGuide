import GuideService from '@services/guide';
import { uploadBuffer } from '@utils/cloudinaryUpload';
import { BadRequestError } from 'node-be-utilities';

import {
	guideProfilePatchSchema,
	guideProfileSchema,
} from '@/server/modules/guide/guide.schema';
import {
	IDENTITY_PROOF_MIME_TYPES,
	IMAGE_MIME_TYPES,
	fileFor,
	filesFor,
	parseMultipart,
} from '@/server/http/multipart';
import { respond } from '@/server/http/respond';
import { createHandler, parseBody, validateBody } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — the calling guide's own profile. Any authenticated role may read it. */
export const GET = createHandler(async (request) => {
	const user = await requireSession(request);

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const profile = await GuideService.getGuideProfile(user.userId);

	return respond({ status: 200, data: profile });
});

/**
 * PUT — one-time registration. Multipart: KYC fields plus a profile photo and
 * up to five identity proofs.
 *
 * Both destinations are Cloudinary, but with a critical difference: the profile
 * photo is public, while identity proofs go up as `authenticated` so their bare
 * URL is a 401 and they can only be delivered through the signed, session-gated
 * download routes. Getting that backwards would publish scans of people's
 * Aadhaar cards to anyone with the URL.
 */
export const PUT = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const form = await parseMultipart(request, [
		{
			field: 'profileImage',
			allowedMimeTypes: IMAGE_MIME_TYPES,
			message: 'Only JPG, PNG, WEBP images are allowed',
			maxCount: 1,
		},
		{
			field: 'identityProofs',
			allowedMimeTypes: IDENTITY_PROOF_MIME_TYPES,
			message: 'Only PDF, PNG, JPG, JPEG files are allowed for identity proofs',
			maxCount: 5,
		},
	]);

	const data = validateBody(form.fields, guideProfileSchema);

	const photo = fileFor(form, 'profileImage');
	const profileImage = photo
		? await uploadBuffer(photo.buffer, 'getmyguide/guides')
		: undefined;

	const proofs = filesFor(form, 'identityProofs');
	const identityProofs = proofs.length
		? await Promise.all(
				proofs.map((file) =>
					uploadBuffer(file.buffer, 'getmyguide/guides/identity-proofs', {
						type: 'authenticated',
					})
				)
			)
		: undefined;

	const profile = await GuideService.upsertGuideProfile(user.userId, data, {
		profileImage,
		identityProofs,
	});

	return respond({ status: 200, data: profile });
});

/** PATCH — post-registration edit. JSON, limited to phone/city/type/languages. */
export const PATCH = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const data = await parseBody(request, guideProfilePatchSchema);
	const profile = await GuideService.patchGuideProfile(user.userId, data);

	return respond({ status: 200, data: profile });
});
