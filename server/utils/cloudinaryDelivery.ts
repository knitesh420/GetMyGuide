import cloudinary from '../config/cloudinary';

/**
 * Turning a stored Cloudinary URL into a *signed* delivery URL.
 *
 * KYC documents (identity proofs) are uploaded as `type: 'authenticated'`, so a
 * bare Cloudinary URL returns 401 — the asset is only served when the request
 * carries a signature that could only have been produced with our API secret.
 * That is the whole point: an identity proof that leaks (a log line, a browser
 * history entry, a database dump) is useless without the server re-signing it.
 *
 * Legacy proofs were uploaded to the default public `upload` type. Signing one
 * is harmless — Cloudinary accepts the signature on a public asset too — so the
 * same code path works before and after those assets are migrated to
 * `access_mode: authenticated` (see scripts/secureGuideIdentityProofs.ts).
 */

export interface ParsedCloudinaryUrl {
	/** 'image' | 'raw' | 'video' — a PDF uploaded via `resource_type: auto` is an image. */
	resourceType: string;
	/** 'upload' (public / access-mode-gated) | 'authenticated' | 'private'. */
	deliveryType: string;
	/** Digits only, no leading `v`. Absent when the URL carries no version. */
	version?: string;
	/** Includes the folder path, never the file extension. */
	publicId: string;
	/** Lower-cased extension, e.g. 'pdf'. Absent when the URL has none. */
	format?: string;
}

const CLOUDINARY_URL_RE =
	/^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/(upload|authenticated|private)\/(.+)$/i;

/**
 * Break a Cloudinary delivery URL into the pieces `cloudinary.url()` needs to
 * rebuild (and sign) it. Returns null for anything that is not a Cloudinary
 * delivery URL — a bare legacy filename, say — so callers can fall back to the
 * value untouched.
 *
 * Only handles the URL shapes this app produces: no inline transformations
 * between the delivery type and the version. A leading signature segment
 * (`s--…--`) is tolerated so re-signing an already-signed URL is idempotent.
 */
export function parseCloudinaryUrl(url: string): ParsedCloudinaryUrl | null {
	const match = CLOUDINARY_URL_RE.exec(url);
	if (!match) return null;

	const [, resourceType, deliveryType, tail] = match;
	const segments = tail.split('/');

	// Drop a signature segment if the stored URL already carries one.
	if (segments[0] && /^s--[^/]+--$/.test(segments[0])) {
		segments.shift();
	}

	let version: string | undefined;
	if (segments[0] && /^v\d+$/.test(segments[0])) {
		version = segments.shift()!.slice(1);
	}

	if (segments.length === 0) return null;

	const last = segments[segments.length - 1];
	const dot = last.lastIndexOf('.');
	let format: string | undefined;
	if (dot > 0) {
		format = last.slice(dot + 1).toLowerCase();
		segments[segments.length - 1] = last.slice(0, dot);
	}

	return {
		resourceType,
		deliveryType,
		version,
		publicId: segments.join('/'),
		format,
	};
}

/**
 * A signed delivery URL for a stored Cloudinary asset. Hands back the input
 * unchanged when it is not a parseable Cloudinary URL, so a legacy local
 * filename (which is served off disk, not from Cloudinary) passes through
 * without harm.
 */
export function signedDeliveryUrl(url: string): string {
	const parsed = parseCloudinaryUrl(url);
	if (!parsed) return url;

	return cloudinary.url(parsed.publicId, {
		resource_type: parsed.resourceType,
		type: parsed.deliveryType,
		...(parsed.format ? { format: parsed.format } : {}),
		...(parsed.version ? { version: parsed.version } : {}),
		sign_url: true,
		secure: true,
	});
}

/**
 * A short-lived URL that serves the ORIGINAL asset bytes from Cloudinary's API
 * host rather than the CDN.
 *
 * This exists because of a hard constraint the signed CDN URL cannot get past:
 * the account's "Allow delivery of PDF and ZIP files" setting is off, and while
 * it is off, `res.cloudinary.com/.../x.pdf` returns 401 `deny or ACL failure` no
 * matter how well signed the request is — the block is on the *format*, not on
 * authorization. Verified against a live proof: the same asset returns 200 when
 * requested as `f_jpg`, and 200 from this endpoint, but 401 as a signed PDF.
 *
 * `api.cloudinary.com/v1_1/<cloud>/<resource_type>/download` is the Admin API's
 * download endpoint. It authenticates with an api_key + signature instead of
 * going through delivery, so the PDF/ZIP gate does not apply. Only the server
 * can mint one (it needs the API secret), and it carries an expiry, so unlike a
 * signed delivery URL it stops working shortly after it is handed out.
 *
 * Returns null when this endpoint cannot address the asset, so callers fall back
 * to `signedDeliveryUrl`:
 *   - the stored value is not a Cloudinary URL;
 *   - it carries no file extension (the endpoint requires an explicit `format`);
 *   - signing is impossible because the API credentials are not configured, in
 *     which case the SDK throws "Must supply api_key". Degrading to the CDN URL
 *     keeps images working on a misconfigured server rather than turning every
 *     document into a 500.
 */
export function originalDownloadUrl(url: string, expiresInSeconds = 300): string | null {
	const parsed = parseCloudinaryUrl(url);
	if (!parsed?.format) return null;

	try {
		return cloudinary.utils.private_download_url(parsed.publicId, parsed.format, {
			resource_type: parsed.resourceType,
			type: parsed.deliveryType,
			expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
		});
	} catch {
		return null;
	}
}
