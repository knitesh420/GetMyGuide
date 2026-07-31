import crypto from 'crypto';
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';

type ResolvedFile = {
	filename: string;
	destination: string;
	path: string;
};
export interface SingleFileUploadOptions {
	field_name: string;
	options: multer.Options;
}
export interface MultipleFileUploadOptions {
	field_names: string[];
	options: multer.Options;
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const tempDir = path.join(global.__basedir, 'static', 'misc');

		cb(null, tempDir); //you tell where to upload the files,
	},
	filename: (req, file, cb) => {
		cb(null, crypto.randomUUID() + path.extname(file.originalname));
	},
});

// Multer applies no size cap unless told to, so an omitted `limits` means
// "unbounded" — a disk-exhaustion DoS one forgetful call site away. Default to
// something sane; call sites can still raise or lower it via options.
const DEFAULT_UPLOAD_LIMITS: multer.Options['limits'] = {
	fileSize: 25 * 1024 * 1024,
};

const SingleFileUpload = (
	req: Request,
	res: Response,
	{ field_name = 'file', options = {} }: SingleFileUploadOptions
) => {
	const upload = multer({
		storage,
		...options,
		limits: { ...DEFAULT_UPLOAD_LIMITS, ...options.limits },
	}).single(field_name);

	return new Promise((resolve: (resolvedFile: ResolvedFile) => void, reject) => {
		upload(req, res, (err) => {
			if (err !== undefined && err !== null) {
				return reject(err);
			}

			if (req.file === undefined || req.file === null) {
				return reject(new Error('No files uploaded.'));
			}

			resolve({
				filename: req.file.filename,
				destination: req.file.destination,
				path: req.file.path,
			});
		});
	});
};

const MultiFileUpload = (
	req: Request,
	res: Response,
	{ field_names = [], options = {} }: MultipleFileUploadOptions
) => {
	const multi_upload = multer({
		storage,
		...options,
		limits: { ...DEFAULT_UPLOAD_LIMITS, ...options.limits },
	}).fields(
		field_names.map((name) => ({
			name,
			maxCount: 1,
		}))
	);
	return new Promise((resolve: (resolvedFile: ResolvedFile[]) => void, reject) => {
		multi_upload(req, res, (err) => {
			if (err !== null) {
				return reject(err);
			}
			if (req.files === undefined || req.files === null) {
				return reject(new Error('No files uploaded.'));
			}
			const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] };
			const files = Object.values(filesMap).flat();
			resolve(
				files.map((file) => ({
					filename: file.filename,
					destination: file.destination,
					path: file.path,
				}))
			);
		});
	});
};

export default { SingleFileUpload, MultiFileUpload };

// `export type` (not a bare re-export): these are types, and Next compiles this
// file under isolatedModules, where the transpiler cannot tell a type-only
// re-export from a value one without the keyword.
export type { MultipleFileUploadOptions as FileUploadOptions, ResolvedFile };

const ALLOWED_MEDIA_MIMETYPES = new Set([
	'image/png',
	'image/webp',
	'image/jpg',
	'image/jpeg',
	'video/mp4',
]);
const ALLOWED_MEDIA_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg', '.mp4']);

const ONLY_MEDIA_ALLOWED = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	// Client-set Content-Type is spoofable, and the stored filename's extension
	// (taken from originalname) is what decides how the file is later served —
	// so reject on the extension too, not just the MIME type.
	const ext = path.extname(file.originalname).toLowerCase();
	if (!ALLOWED_MEDIA_MIMETYPES.has(file.mimetype) || !ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
		return cb(new Error('Only JPG, PNG, WEBP, MP4  images are allowed'));
	}
	cb(null, true);
};

export { ONLY_MEDIA_ALLOWED };
