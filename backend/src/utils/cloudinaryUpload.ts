import { UploadApiResponse } from 'cloudinary';
import fs from 'fs/promises';
import cloudinary from '../config/cloudinary';

const uploadToCloudinary = async (
	file: string | Buffer,
	folder: string = 'getmyguide'
): Promise<UploadApiResponse> => {
	if (Buffer.isBuffer(file)) {
		return new Promise((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(
				{
					resource_type: 'auto',
					folder,
				},
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

	const result = await cloudinary.uploader.upload(file, {
		resource_type: 'auto',
		folder,
	});

	return result;
};

/**
 * Upload a multer disk-storage file to Cloudinary and return its secure URL.
 *
 * The guide upload middleware writes to `static/misc` first, so the temp file
 * is removed once Cloudinary has the bytes. A failed unlink is not fatal — the
 * image is already safely stored — so it must not fail the request.
 */
export const uploadMulterImage = async (
	file: Express.Multer.File,
	folder: string
): Promise<string> => {
	const result = await uploadToCloudinary(file.path, folder);

	try {
		await fs.unlink(file.path);
	} catch {
		// temp file left behind; harmless
	}

	return result.secure_url;
};

export default uploadToCloudinary;
