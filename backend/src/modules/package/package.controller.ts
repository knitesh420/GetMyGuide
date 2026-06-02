import cloudinary from '@config/cloudinary';
import { JWTPayload } from '@services/jwt';
import PackageService from '@services/package';
import uploadToCloudinary from '@utils/cloudinaryUpload';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError, Respond } from 'node-be-utilities';
import {
	CreatePackageValidationResult,
	UpdatePackageValidationResult,
	UpdateStatusValidationResult,
} from './package.validator';

const PACKAGE_IMAGE_FOLDER = 'packages';
const ALLOWED_PACKAGE_IMAGE_TYPES = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];

type PackageImagePayload = {
	url: string;
	publicId: string;
};

function validatePackageImageFiles(files: Express.Multer.File[]) {
	for (const file of files) {
		if (!ALLOWED_PACKAGE_IMAGE_TYPES.includes(file.mimetype)) {
			throw new BadRequestError('Only JPG, PNG, WEBP images are allowed');
		}
	}
}

async function deleteCloudinaryImages(images: PackageImagePayload[], ignoreErrors = false) {
	for (const image of images) {
		try {
			await cloudinary.uploader.destroy(image.publicId);
		} catch (error) {
			if (!ignoreErrors) {
				throw error;
			}
		}
	}
}

async function uploadPackageImages(files: Express.Multer.File[]): Promise<PackageImagePayload[]> {
	const uploadedImages: PackageImagePayload[] = [];

	try {
		for (const file of files) {
			const result = await uploadToCloudinary(file.buffer, PACKAGE_IMAGE_FOLDER);
			uploadedImages.push({
				url: result.secure_url,
				publicId: result.public_id,
			});
		}

		return uploadedImages;
	} catch (error) {
		await deleteCloudinaryImages(uploadedImages, true);
		throw error;
	}
}

async function createPackage(req: Request, res: Response, next: NextFunction) {
	let uploadedImages: PackageImagePayload[] = [];

	try {
		const data = req.locals.data as CreatePackageValidationResult;

		const files = req.files as Express.Multer.File[] | undefined;

		if (!files || files.length === 0) {
			return next(new BadRequestError('At least one image file is required'));
		}

		validatePackageImageFiles(files);
		uploadedImages = await uploadPackageImages(files);

		const pkg = await PackageService.createPackage({
			...data,
			images: uploadedImages,
		});

		return Respond({
			res,
			status: 201,
			data: pkg,
		});
	} catch (error) {
		if (uploadedImages.length > 0) {
			await deleteCloudinaryImages(uploadedImages, true);
		}
		return next(error);
	}
}

async function getPackages(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload | undefined;
		const isAdmin = user?.role === 'admin';

		const filters: any = {};

		// Parse query parameters
		if (req.query.featured === 'true') {
			filters.featured = true;
		}

		if (req.query.city && typeof req.query.city === 'string') {
			filters.city = req.query.city;
		}

		if (req.query.limit && typeof req.query.limit === 'string') {
			const limitValue = Number(req.query.limit);
			if (Number.isInteger(limitValue) && limitValue > 0) {
				filters.limit = limitValue;
			}
		}

		// If admin, allow filtering by status
		if (isAdmin && req.query.status) {
			if (req.query.status === 'active' || req.query.status === 'inactive') {
				filters.status = req.query.status;
			}
		}

		const packages = await PackageService.getPackages(filters, isAdmin);

		return Respond({
			res,
			status: 200,
			data: {
				packages,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getPackageById(req: Request, res: Response, next: NextFunction) {
	try {
		const packageId = req.locals.id!;
		const user = req.locals.user as JWTPayload | undefined;
		const isAdmin = user?.role === 'admin';

		const pkg = await PackageService.getPackageById(packageId, isAdmin);

		return Respond({
			res,
			status: 200,
			data: pkg,
		});
	} catch (error) {
		return next(error);
	}
}

async function updatePackage(req: Request, res: Response, next: NextFunction) {
	try {
		const packageId = req.locals.id!;
		const data = req.locals.data as UpdatePackageValidationResult;

		const files = req.files as Express.Multer.File[] | undefined;

		const updateData: any = { ...data };

		if (files && files.length > 0) {
			validatePackageImageFiles(files);

			const existingPackage = await PackageService.getPackageById(packageId, true);
			const uploadedImages = await uploadPackageImages(files);
			updateData.images = uploadedImages;

			let updatedPackage;
			try {
				updatedPackage = await PackageService.updatePackage(packageId, updateData);
			} catch (error) {
				await deleteCloudinaryImages(uploadedImages, true);
				throw error;
			}

			await deleteCloudinaryImages(existingPackage.images);

			return Respond({
				res,
				status: 200,
				data: updatedPackage,
			});
		}

		const updatedPackage = await PackageService.updatePackage(packageId, updateData);

		return Respond({
			res,
			status: 200,
			data: updatedPackage,
		});
	} catch (error) {
		return next(error);
	}
}

async function deletePackage(req: Request, res: Response, next: NextFunction) {
	try {
		const packageId = req.locals.id!;

		const pkg = await PackageService.getPackageById(packageId, true);
		await deleteCloudinaryImages(pkg.images);

		await PackageService.deletePackage(packageId);

		return Respond({
			res,
			status: 200,
			data: {
				message: 'Package deleted successfully',
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function updatePackageStatus(req: Request, res: Response, next: NextFunction) {
	try {
		const packageId = req.locals.id!;
		const data = req.locals.data as UpdateStatusValidationResult;

		const pkg = await PackageService.updatePackageStatus(packageId, data.status);

		return Respond({
			res,
			status: 200,
			data: pkg,
		});
	} catch (error) {
		return next(error);
	}
}

async function getAvailableCities(req: Request, res: Response, next: NextFunction) {
	try {
		const cities = await PackageService.getAvailableCities();

		return Respond({
			res,
			status: 200,
			data: {
				cities,
			},
		});
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	createPackage,
	getPackages,
	getPackageById,
	updatePackage,
	deletePackage,
	updatePackageStatus,
	getAvailableCities,
};

export default Controller;
