import { BadRequestError } from 'node-be-utilities';

/**
 * Multipart form parsing for native Route Handlers.
 *
 * This replaces multer. The Web `Request.formData()` gives us files as Blobs in
 * memory, so unlike multer's diskStorage there is no temp file, no staging
 * directory and no `/tmp` dependency — which is the right shape for serverless,
 * where the bundle is read-only and any local disk is per-invocation anyway.
 *
 * Every consumer of these files already pushes the bytes to Cloudinary and then
 * unlinks the temp file (see utils/cloudinaryUpload.ts), and uploadToCloudinary
 * already accepts a Buffer — so going straight to a Buffer removes a write, a
 * read and a delete from every upload rather than merely relocating them.
 *
 * The MIME allow-lists are enforced here exactly as multer's fileFilter did.
 * They remain the *secondary* guard: Content-Type is client-supplied and
 * therefore spoofable, so the real protection against an uploaded file
 * executing as active content is the download/inline decision made when it is
 * served, plus the global X-Content-Type-Options: nosniff header.
 */

export interface UploadedFile {
	/** Field name the file arrived under. */
	field: string;
	/** Original filename as supplied by the client. Never used as a path. */
	originalName: string;
	mimetype: string;
	size: number;
	buffer: Buffer;
}

export interface ParsedForm {
	/** Non-file fields, flattened to strings — the shape validators expect. */
	fields: Record<string, string>;
	files: UploadedFile[];
}

export interface FilePolicy {
	/** Field name this policy applies to. */
	field: string;
	allowedMimeTypes: string[];
	/** Human-readable rejection message, matching the multer fileFilter's. */
	message: string;
	maxCount?: number;
	/** Bytes. Defaults to 10MB, matching the multer limits. */
	maxSize?: number;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/**
 * Parse a multipart request.
 *
 * `policies` mirrors the multer `.fields([...])` / `.single()` configuration.
 * A file arriving under a field with no policy is ignored, which is what the
 * single-file multer parsers did with a mismatched field name.
 */
export async function parseMultipart(
	request: Request,
	policies: FilePolicy[]
): Promise<ParsedForm> {
	let form: FormData;

	try {
		form = await request.formData();
	} catch {
		throw new BadRequestError('Invalid multipart form data');
	}

	const byField = new Map(policies.map((policy) => [policy.field, policy]));
	const counts = new Map<string, number>();

	const fields: Record<string, string> = {};
	const files: UploadedFile[] = [];

	for (const [name, value] of form.entries()) {
		if (typeof value === 'string') {
			fields[name] = value;
			continue;
		}

		const policy = byField.get(name);
		if (!policy) {
			// Unconfigured field — ignored, as multer did.
			continue;
		}

		const blob = value as File;

		if (!policy.allowedMimeTypes.includes(blob.type)) {
			throw new BadRequestError(policy.message);
		}

		const maxSize = policy.maxSize ?? DEFAULT_MAX_SIZE;
		if (blob.size > maxSize) {
			// Same wording multer's MulterError used, so clients see no change.
			throw new BadRequestError('File too large');
		}

		const seen = (counts.get(name) ?? 0) + 1;
		counts.set(name, seen);
		if (policy.maxCount !== undefined && seen > policy.maxCount) {
			throw new BadRequestError(`Too many files for field ${name}`);
		}

		files.push({
			field: name,
			originalName: blob.name,
			mimetype: blob.type,
			size: blob.size,
			buffer: Buffer.from(await blob.arrayBuffer()),
		});
	}

	return { fields, files };
}

/** The single file for a field, or undefined. */
export function fileFor(form: ParsedForm, field: string): UploadedFile | undefined {
	return form.files.find((file) => file.field === field);
}

/** Every file for a field, in arrival order. */
export function filesFor(form: ParsedForm, field: string): UploadedFile[] {
	return form.files.filter((file) => file.field === field);
}

// ---- Shared MIME allow-lists, transcribed from the multer fileFilters -------

export const IMAGE_MIME_TYPES = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];

export const DOCUMENT_MIME_TYPES = [
	'application/pdf',
	'image/png',
	'image/webp',
	'image/jpg',
	'image/jpeg',
];

/** Identity proofs on the registration form: PDF/PNG/JPG only (no WebP). */
export const IDENTITY_PROOF_MIME_TYPES = [
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/jpg',
];
