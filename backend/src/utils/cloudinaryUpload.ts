import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

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

export default uploadToCloudinary;
