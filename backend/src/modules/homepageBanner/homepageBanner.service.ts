import fs from 'fs-extra';
import HomepageBanner from './homepageBanner.model';
import uploadToCloudinary from '../../utils/cloudinaryUpload';

export const createHomepageBannerService = async (files: any[]) => {
	const uploadedVideos = [];

	for (const file of files) {
		const uploadedVideo = await uploadToCloudinary(file.path, 'homepage-banner');

		await fs.remove(file.path);

		const optimizedUrl = uploadedVideo.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');

		uploadedVideos.push(optimizedUrl);
	}

	const banner = await HomepageBanner.create({
		videos: uploadedVideos,
	});

	return banner;
};

export const getHomepageBannersService = async () => {
	const banners = await HomepageBanner.find().sort({ createdAt: -1 });
	return banners;
};
