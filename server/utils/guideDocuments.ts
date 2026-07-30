import fs from 'fs';
import path from 'path';

/**
 * Guide.identityProofs is [licence, aadhaar] in upload order — see the guide
 * upload middleware and scripts/backfillGuideFromEnrollment.ts.
 */
export const PROOF_LABELS = ['Driving Licence', 'Aadhaar Card'] as const;

export interface GuideDocument {
	/** Position in Guide.identityProofs — this is what the download route takes. */
	index: number;
	label: string;
	/** Raw stored value: a Cloudinary URL, or a bare filename for older uploads. */
	value: string;
	storage: 'remote' | 'local';
	/**
	 * Path (relative to the API origin) of the ADMIN-ONLY streaming route. The
	 * frontend prefixes NEXT_PUBLIC_API_URL. Never a raw disk path, and never the
	 * unauthenticated /media route.
	 */
	url: string;
	downloadUrl: string;
	/** False when the row points at a local file that is no longer on disk. */
	available: boolean;
}

/** Anything we ever stored that is already a fetchable URL. */
export function isRemoteDocument(value: string): boolean {
	return /^https?:\/\//i.test(value);
}

/**
 * Where a legacy (pre-Cloudinary) identity proof lives on disk. Uploads landed
 * in `static/misc` via multer's disk storage, keyed only by filename.
 *
 * `path.basename` is load-bearing, not tidiness: the stored value reaches this
 * function from the database, and a value like `../../.env` would otherwise
 * escape the static directory.
 */
export function localDocumentPath(value: string): string {
	return path.join(global.__basedir, 'static', 'misc', path.basename(value));
}

const MIME_BY_EXTENSION: Record<string, string> = {
	pdf: 'application/pdf',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	heic: 'image/heic',
};

export function documentMimeType(value: string): string {
	const ext = path.extname(value).replace('.', '').toLowerCase();
	return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

/**
 * Turn the raw `identityProofs` array into something an admin UI can link to.
 *
 * The bug this exists to kill: identity proofs are stored as bare filenames
 * ("4f2c….pdf"), and the admin panel used that string straight as an href. The
 * browser resolved it against the *frontend* origin, so every document 404'd.
 * Documents are now always addressed through the authenticated route below.
 */
export function describeGuideDocuments(
	guideAccountId: string,
	identityProofs: string[] | undefined
): GuideDocument[] {
	return (identityProofs ?? []).map((value, index) => {
		const remote = isRemoteDocument(value);
		const base = `/guide/${guideAccountId}/documents/${index}`;

		return {
			index,
			label: PROOF_LABELS[index] ?? `Document ${index + 1}`,
			value,
			storage: remote ? 'remote' : 'local',
			url: base,
			downloadUrl: `${base}?download=1`,
			// A remote (Cloudinary) document is assumed present; a local one is only
			// as real as the disk. Surfacing this lets the admin panel say "missing"
			// instead of dead-ending on another 404.
			available: remote || fs.existsSync(localDocumentPath(value)),
		};
	});
}
