import { originalDownloadUrl, signedDeliveryUrl } from '@utils/cloudinaryDelivery';
import { documentMimeType, localDocumentPath } from '@utils/guideDocuments';
import axios from 'axios';
import fs from 'fs';
import { NotFoundError, ServerError } from 'node-be-utilities';

import { SECURITY_HEADERS } from './respond';

/**
 * Stream a stored KYC document back to the caller.
 *
 * Native port of `streamStoredDocument` in guide.controller.ts. Who is allowed
 * through is settled by the route before this is called — this only decides
 * where the bytes come from.
 *
 * A stored document is either on Cloudinary (recent uploads) or on the API
 * server's local disk (older uploads). Neither is ever handed to the browser as
 * a URL:
 *
 *   - Cloudinary proofs are uploaded as `authenticated`, so their bare URL is a
 *     401 — and even a signed one would sit in browser history readable by
 *     anyone who found it, since signedDeliveryUrl mints no expiry. Streaming
 *     keeps the session as the only key.
 *   - PDFs cannot be fetched from the CDN at all while the account's "Allow
 *     delivery of PDF and ZIP files" setting is off — signed or not, it is 401.
 *     So we fetch through the Admin API download endpoint, which is not subject
 *     to that gate. See originalDownloadUrl.
 *
 * The local-disk branch is retained for pre-Cloudinary uploads. On serverless it
 * will essentially always miss, and its error message says exactly that: the fix
 * is a re-upload, and only a specific message gets the reader there.
 */
export async function streamStoredDocument(
	document: { value: string; storage: 'remote' | 'local'; label: string },
	asAttachment: boolean
): Promise<Response> {
	const extension = document.value.slice(document.value.lastIndexOf('.'));
	const filename = `${document.label.replace(/\s+/g, '-').toLowerCase()}${extension}`;
	const disposition = `${asAttachment ? 'attachment' : 'inline'}; filename="${filename}"`;

	if (document.storage === 'remote') {
		// Prefer the download endpoint (works for PDFs regardless of the account
		// delivery setting); fall back to a signed CDN URL for anything it cannot
		// address, such as a stored value with no file extension.
		const source = originalDownloadUrl(document.value) ?? signedDeliveryUrl(document.value);

		let upstream;
		try {
			upstream = await axios.get<ArrayBuffer>(source, {
				responseType: 'arraybuffer',
				// Read Cloudinary's own status rather than throwing on 4xx, so a 401
				// can be turned into an actionable message below.
				validateStatus: () => true,
				timeout: 20000,
			});
		} catch {
			throw new ServerError('Could not reach the document store. Please try again in a moment.');
		}

		if (upstream.status !== 200) {
			// A 401 here means the API credentials are wrong or the asset's delivery
			// type does not match what its URL says — not the PDF gate, which this
			// path routes around.
			if (upstream.status === 401) {
				throw new ServerError(
					`The ${document.label} could not be fetched from the document store (401). Check the Cloudinary API credentials on this server.`
				);
			}
			throw new NotFoundError(
				`The ${document.label} is no longer available from the document store (status ${upstream.status}). Ask the guide to re-upload it.`
			);
		}

		const headers = new Headers(SECURITY_HEADERS);
		headers.set(
			'Content-Type',
			(upstream.headers['content-type'] as string) || documentMimeType(document.value)
		);
		headers.set('Content-Disposition', disposition);
		// KYC documents must never be held by a shared cache.
		headers.set('Cache-Control', 'private, no-store');

		return new Response(new Uint8Array(Buffer.from(upstream.data)), { status: 200, headers });
	}

	const filePath = localDocumentPath(document.value);
	if (!fs.existsSync(filePath)) {
		// The row points at a file the server no longer has — almost certainly a
		// pre-Cloudinary upload lost to a redeploy. Say so rather than leaving the
		// reader staring at a bare 404.
		throw new NotFoundError(
			`The ${document.label} file is no longer on the server. It needs to be re-uploaded from the guide profile.`
		);
	}

	const bytes = await fs.promises.readFile(filePath);

	const headers = new Headers(SECURITY_HEADERS);
	headers.set('Content-Length', String(bytes.length));
	// The generic /media route has no PDF entry and falls back to octet-stream,
	// so a scanned Aadhaar downloaded instead of opening.
	headers.set('Content-Type', documentMimeType(document.value));
	headers.set('Content-Disposition', disposition);
	headers.set('Cache-Control', 'private, no-store');

	return new Response(new Uint8Array(bytes), { status: 200, headers });
}

/** `?download=1` (or `=true`) forces a save dialog instead of inline render. */
export function wantsAttachment(request: Request): boolean {
	const value = new URL(request.url).searchParams.get('download');
	return value === '1' || value === 'true';
}

/** The two document slots a guide manages themselves. */
export const IDENTITY_DOCUMENT_TYPES = ['aadhaar', 'guideLicence'] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];
