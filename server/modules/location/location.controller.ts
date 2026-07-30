import LocationService from '@services/location';
import uploadToCloudinary from '@utils/cloudinaryUpload';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import {
	LocationCreateValidationResult,
	LocationListQueryValidationResult,
	LocationUpdateValidationResult,
} from './location.validator';

/**
 * The admin panel posts locations as multipart with an image file. Push it to
 * Cloudinary and hand back the URL, which is what the schema stores. Returns
 * undefined when no file was sent, so an update without a new image leaves the
 * existing one alone rather than clearing it.
 */
async function uploadImageIfPresent(req: Request): Promise<string | undefined> {
	const file = req.file as Express.Multer.File | undefined;
	if (!file?.buffer) {
		return undefined;
	}

	const result = await uploadToCloudinary(file.buffer, 'locations');
	return result.secure_url;
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const { city, popular, search } = req.locals.data as LocationListQueryValidationResult;
		const locations = await LocationService.getAll({ city, popular, search });

		return Respond({ res, status: 200, data: locations });
	} catch (error) {
		return next(error);
	}
}

async function getAllForAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const locations = await LocationService.getAllForAdmin();
		return Respond({ res, status: 200, data: locations });
	} catch (error) {
		return next(error);
	}
}

async function getById(req: Request, res: Response, next: NextFunction) {
	try {
		// Accepts an id or a slug — the public pages route by slug.
		const location = await LocationService.getById(req.params.id as string);
		return Respond({ res, status: 200, data: location });
	} catch (error) {
		return next(error);
	}
}

async function create(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as LocationCreateValidationResult;
		const image = await uploadImageIfPresent(req);

		const location = await LocationService.create(
			{ ...data, ...(image ? { image } : {}) },
			req.locals.user!.userId
		);

		return Respond({ res, status: 201, data: location });
	} catch (error) {
		return next(error);
	}
}

async function update(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as LocationUpdateValidationResult;
		const image = await uploadImageIfPresent(req);

		const location = await LocationService.update(
			req.params.id as string,
			{ ...data, ...(image ? { image } : {}) },
			req.locals.user!.userId
		);

		return Respond({ res, status: 200, data: location });
	} catch (error) {
		return next(error);
	}
}

async function remove(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await LocationService.remove(req.params.id as string, req.locals.user!.userId);
		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getAll,
	getAllForAdmin,
	getById,
	create,
	update,
	remove,
};

export default Controller;
