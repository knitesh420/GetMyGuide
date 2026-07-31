import GuideService from '@services/guide';
import { BadRequestError } from 'node-be-utilities';

import { validateIdString } from '@/server/http/id';
import { streamStoredDocument, wantsAttachment } from '@/server/http/documents';
import { createHandler } from '@/server/http/route';
import { requireMinLevel, requireSession } from '@/server/http/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/:id/documents/:index — legacy positional KYC document store.
 *
 * Guide.identityProofs holds bare filenames, not URLs: the admin panel was
 * using them as hrefs, which resolved against the frontend origin and 404'd.
 * Documents are private, so they are streamed from here behind an admin session
 * rather than linked directly.
 */
export const GET = createHandler(async (request, { params }) => {
	const user = await requireSession(request);
	requireMinLevel(user, 'admin');

	const id = validateIdString(params.id);

	const index = Number.parseInt(params.index, 10);
	if (!Number.isInteger(index) || index < 0) {
		throw new BadRequestError('Document index must be a non-negative integer');
	}

	const document = await GuideService.getGuideDocument(id, index);

	return streamStoredDocument(document, wantsAttachment(request));
});
