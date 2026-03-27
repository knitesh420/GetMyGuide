import { Path } from '@config/const';
import { JWTPayload } from '@services/jwt';
import PackageService from '@services/package';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs/promises';
import { BadRequestError, Respond } from 'node-be-utilities';
import path from 'path';
import {
	CreatePackageValidationResult,
	UpdatePackageValidationResult,
	UpdateStatusValidationResult,
} from './package.validator';

async function createPackage(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as CreatePackageValidationResult;

		// Get uploaded files from multer (already processed by parsePackageFormData middleware)
		const files = req.files as Express.Multer.File[] | undefined;

		if (!files || files.length === 0) {
			return next(new BadRequestError('At least one image file is required'));
		}

		// Validate image file types
		const allowedImageTypes = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
		for (const file of files) {
			if (!allowedImageTypes.includes(file.mimetype)) {
				return next(new BadRequestError('Only JPG, PNG, WEBP images are allowed'));
			}
		}

		const imageFilenames = files.map((file) => file.filename);

		// Create package using service
		const pkg = await PackageService.createPackage({
			...data,
			images: imageFilenames,
		});

		// Move files from static/misc to static/packages after successful creation
		const packagesDir = path.join(global.__basedir, Path.Packages);
		const miscDir = path.join(global.__basedir, Path.Misc);

		// Ensure packages directory exists
		await fs.mkdir(packagesDir, { recursive: true });

		// Move all image files
		for (const filename of imageFilenames) {
			const sourcePath = path.join(miscDir, filename);
			const destPath = path.join(packagesDir, filename);
			await fs.rename(sourcePath, destPath);
		}

		return Respond({
			res,
			status: 201,
			data: pkg,
		});
	} catch (error) {
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

		// Get uploaded files from multer if any
		const files = req.files as Express.Multer.File[] | undefined;

		const updateData: any = { ...data };

		// If images are being updated
		if (files && files.length > 0) {
			// Validate image file types
			const allowedImageTypes = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
			for (const file of files) {
				if (!allowedImageTypes.includes(file.mimetype)) {
					return next(new BadRequestError('Only JPG, PNG, WEBP images are allowed'));
				}
			}

			const imageFilenames = files.map((file) => file.filename);
			updateData.images = imageFilenames;

			// Get existing package to delete old images
			const existingPackage = await PackageService.getPackageById(packageId, true);
			const packagesDir = path.join(global.__basedir, Path.Packages);
			const miscDir = path.join(global.__basedir, Path.Misc);

			// Delete old images
			for (const oldImage of existingPackage.images) {
				const oldImagePath = path.join(packagesDir, oldImage);
				try {
					await fs.unlink(oldImagePath);
				} catch {
					// Ignore errors if file doesn't exist
				}
			}

			// Move new files from static/misc to static/packages
			await fs.mkdir(packagesDir, { recursive: true });

			for (const filename of imageFilenames) {
				const sourcePath = path.join(miscDir, filename);
				const destPath = path.join(packagesDir, filename);
				await fs.rename(sourcePath, destPath);
			}
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

		// Get package to delete associated images
		const pkg = await PackageService.getPackageById(packageId, true);
		const packagesDir = path.join(global.__basedir, Path.Packages);

		// Delete all associated images
		for (const image of pkg.images) {
			const imagePath = path.join(packagesDir, image);
			try {
				await fs.unlink(imagePath);
			} catch {
				// Ignore errors if file doesn't exist
			}
		}

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
