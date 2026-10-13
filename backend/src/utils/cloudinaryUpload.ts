import { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import fs from 'fs/promises';
import cloudinary from '../config/cloudinary';

class CloudinaryUploadCleanupError extends Error {
	constructor(
		readonly uploadError: unknown,
		readonly cleanupError: unknown
	) {
		super('Cloudinary upload and temporary-file cleanup both failed');
		this.name = 'CloudinaryUploadCleanupError';
	}
}

const uploadToCloudinary = async (
	file: string | Buffer,
	folder: string = 'getmyguide',
	options: UploadApiOptions = {}
): Promise<UploadApiResponse> => {
	const uploadOptions: UploadApiOptions = {
		resource_type: 'auto',
		folder,
		...options,
	};

	if (Buffer.isBuffer(file)) {
		return new Promise((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(
				uploadOptions,
				(error, result) => {
					if (error) {
						return reject(error);
					}

					if (!result) {
						return reject(new Error('Cloudinary upload failed'));
					}

					return resolve(result);
				}
			);

			uploadStream.end(file);
		});
	}

	const result = await cloudinary.uploader.upload(file, uploadOptions);

	return result;
};

/**
 * Upload a multer disk-storage file to Cloudinary and return its secure URL.
 *
 * The guide upload middleware stages files outside the static web root, then
 * removes the temporary file whether the Cloudinary upload succeeds or fails.
 *
 * `options` is passed straight through to Cloudinary. KYC uploads use
 * `{ type: 'authenticated' }` so the resulting asset is NOT publicly readable by
 * URL — it can only be delivered via a server-signed URL (see
 * `utils/cloudinaryDelivery.ts`). Public assets (profile photos, package images)
 * pass nothing and stay on the default public `upload` type.
 */
export const uploadMulterImage = async (
	file: Express.Multer.File,
	folder: string,
	options: UploadApiOptions = {}
): Promise<string> => {
	const removeTemporaryFile = async () => {
		try {
			await fs.unlink(file.path);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
	};

	let result: UploadApiResponse;
	try {
		result = await uploadToCloudinary(file.path, folder, options);
	} catch (uploadError) {
		try {
			await removeTemporaryFile();
		} catch (cleanupError) {
			throw new CloudinaryUploadCleanupError(uploadError, cleanupError);
		}
		throw uploadError;
	}

	await removeTemporaryFile();
	return result.secure_url;
};

export default uploadToCloudinary;
