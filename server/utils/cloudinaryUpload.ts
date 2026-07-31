import { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import fs from 'fs/promises';
import cloudinary from '../config/cloudinary';

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
 * The guide upload middleware writes to `static/misc` first, so the temp file
 * is removed once Cloudinary has the bytes. A failed unlink is not fatal — the
 * image is already safely stored — so it must not fail the request.
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
	const result = await uploadToCloudinary(file.path, folder, options);

	try {
		await fs.unlink(file.path);
	} catch {
		// temp file left behind; harmless
	}

	return result.secure_url;
};

/**
 * Upload an in-memory file to Cloudinary and return its secure URL.
 *
 * The native Route Handlers parse multipart with the Web FormData API, which
 * yields bytes rather than a temp file on disk — so there is nothing to write
 * and nothing to unlink. Same Cloudinary options as `uploadMulterImage`,
 * including `{ type: 'authenticated' }` for KYC assets, which makes them
 * unreadable by bare URL and deliverable only through a server-signed one.
 */
export const uploadBuffer = async (
	buffer: Buffer,
	folder: string,
	options: UploadApiOptions = {}
): Promise<string> => {
	const result = await uploadToCloudinary(buffer, folder, options);
	return result.secure_url;
};

export default uploadToCloudinary;
