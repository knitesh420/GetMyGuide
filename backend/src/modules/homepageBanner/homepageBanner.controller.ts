import { Request, Response, NextFunction } from 'express';
import { createHomepageBannerService, getHomepageBannersService } from './homepageBanner.service';
import { Respond, ServerError } from 'node-be-utilities';

export const uploadHomepageBanner = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const files: any = req.files;

		if (!files || files.length === 0) {
			return next(new ServerError('No videos uploaded', 400));
		}

		const banner = await createHomepageBannerService(files);

		return Respond({
			res,
			status: 200,
			data: banner,
		});
	} catch (error: any) {
		return next(new ServerError(error.message));
	}
};

export const getHomepageBanners = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const banners = await getHomepageBannersService();

		return Respond({
			res,
			status: 200,
			data: banners,
		});
	} catch (error: any) {
		return next(new ServerError(error.message));
	}
};
