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

const SingleFileUpload = (
	req: Request,
	res: Response,
	{ field_name = 'file', options = {} }: SingleFileUploadOptions
) => {
	const upload = multer({ storage, ...options }).single(field_name);

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
	const multi_upload = multer({ storage, ...options }).fields(
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

export { MultipleFileUploadOptions as FileUploadOptions, ResolvedFile };

const ONLY_MEDIA_ALLOWED = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (
		file.mimetype !== 'image/png' &&
		file.mimetype !== 'image/webp' &&
		file.mimetype !== 'image/jpg' &&
		file.mimetype !== 'image/jpeg' &&
		file.mimetype !== 'video/mp4'
	) {
		return cb(new Error('Only JPG, PNG, WEBP, MP4  images are allowed'));
	}
	cb(null, true);
};

export { ONLY_MEDIA_ALLOWED };
