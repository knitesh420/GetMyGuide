import GuideService from '@services/guide';
import { BadRequestError } from 'node-be-utilities';

import {
	IDENTITY_DOCUMENT_TYPES,
	type IdentityDocumentType,
	streamStoredDocument,
	wantsAttachment,
} from '@/server/http/documents';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseDocumentType(value: unknown): IdentityDocumentType {
	if (typeof value === 'string' && (IDENTITY_DOCUMENT_TYPES as readonly string[]).includes(value)) {
		return value as IdentityDocumentType;
	}
	throw new BadRequestError('Document type must be either "aadhaar" or "guideLicence"');
}

/**
 * GET /api/guide/profile/documents/:type/view
 *
 * The calling guide reading back their own identity document. Streamed from
 * here rather than linked on Cloudinary: the asset is private, and a signed CDN
 * URL would be a permanently-readable link to an identity document sitting in
 * browser history. `?download=1` saves instead of rendering inline.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'guide');

	if (!user?.userId) {
		throw new BadRequestError('User not authenticated');
	}

	const type = parseDocumentType(params.type);
	const document = await GuideService.getOwnIdentityDocument(user.userId, type);

	return streamStoredDocument(document, wantsAttachment(request));
});
