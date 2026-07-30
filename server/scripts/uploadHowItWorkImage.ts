import * as path from 'path';
import * as dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config({ path: path.join(__dirname, '../../.env') });

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
	const fullPath = path.join(__dirname, '../../../frontend/public/how-it-work.png');
	const result = await cloudinary.uploader.upload(fullPath, {
		public_id: 'getmyguide/public/how-it-work',
		overwrite: true,
		resource_type: 'image',
	});
	console.log(result.secure_url);
}

main();
