import GuideService from '@services/guide';
import { BadRequestError } from 'node-be-utilities';

import { validateIdString } from '@/server/http/id';
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
 * GET /api/guide/admin/:id/identity-documents/:type
 *
 * The guide-managed identity documents, streamed for KYC review. Distinct from
 * /:id/documents/:index, which indexes the legacy positional store.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);
	const type = parseDocumentType(params.type);

	const document = await GuideService.getIdentityDocumentForAdmin(id, type);

	return streamStoredDocument(document, wantsAttachment(request));
});
