import GuideService from '@services/guide';
import { uploadBuffer } from '@utils/cloudinaryUpload';
import { BadRequestError } from 'node-be-utilities';

import { IMAGE_MIME_TYPES, fileFor, parseMultipart } from '@/server/http/multipart';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT/DELETE /api/guide/profile/photo
 *
 * A registered guide manages their profile photo without re-running the
 * one-time PUT /profile registration. It is their own to change, so the guide
 * session is the only gate.
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
	]);

	const file = fileFor(form, 'profileImage');
	if (!file) {
		throw new BadRequestError('No image file was uploaded');
	}

	// Public asset, unlike the identity documents below.
	const url = await uploadBuffer(file.buffer, 'getmyguide/guides');
	const profile = await GuideService.updateProfilePhoto(user.userId, url);

	return respond({ status: 200, data: profile });
});

export const DELETE = createHandler(async (request) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const profile = await GuideService.deleteProfilePhoto(user.userId);

	return respond({ status: 200, data: profile });
});
