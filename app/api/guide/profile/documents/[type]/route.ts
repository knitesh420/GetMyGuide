import GuideService from '@services/guide';
import { uploadBuffer } from '@utils/cloudinaryUpload';
import { BadRequestError } from 'node-be-utilities';

import { IDENTITY_DOCUMENT_TYPES, type IdentityDocumentType } from '@/server/http/documents';
import { DOCUMENT_MIME_TYPES, fileFor, parseMultipart } from '@/server/http/multipart';
import { respond } from '@/server/http/respond';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The two document slots a guide manages themselves. Anything else on `:type`
 * is a 400 rather than silently writing an unknown key.
 */
function parseDocumentType(value: unknown): IdentityDocumentType {
	if (typeof value === 'string' && (IDENTITY_DOCUMENT_TYPES as readonly string[]).includes(value)) {
		return value as IdentityDocumentType;
	}
	throw new BadRequestError('Document type must be either "aadhaar" or "guideLicence"');
}

/**
 * PUT /api/guide/profile/documents/:type
 *
 * KYC documents go to Cloudinary as `authenticated`, NOT public — their bare
 * URL is a 401 and they are readable only through the session-gated streaming
 * routes. This is the difference between a private identity document and a
 * publicly-addressable scan of someone's Aadhaar card.
 */
export const PUT = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const type = parseDocumentType(params.type);

	const form = await parseMultipart(request, [
		{
			field: 'document',
			allowedMimeTypes: DOCUMENT_MIME_TYPES,
			message: 'Only PDF, PNG, JPG, JPEG, WEBP files are allowed',
			maxCount: 1,
		},
	]);

	const file = fileFor(form, 'document');
	if (!file) {
		throw new BadRequestError('No document file was uploaded');
	}

	const url = await uploadBuffer(file.buffer, 'getmyguide/guides/identity-proofs', {
		type: 'authenticated',
	});

	const profile = await GuideService.upsertIdentityDocument(user.userId, type, {
		url,
		storage: 'remote',
		mimeType: file.mimetype,
		originalName: file.originalName,
		size: file.size,
		uploadedAt: new Date(),
	});

	return respond({ status: 200, data: profile });
});

export const DELETE = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const type = parseDocumentType(params.type);
	const profile = await GuideService.deleteIdentityDocument(user.userId, type);

	return respond({ status: 200, data: profile });
});
