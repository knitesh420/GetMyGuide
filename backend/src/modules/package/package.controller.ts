import { Request, Response, NextFunction } from 'express';
import Package from './package.schema';
import uploadToCloudinary from '../../utils/cloudinaryUpload';
import cloudinary from '../../config/cloudinary';

export class PackageController {
	/*
   ==========================================
   CREATE PACKAGE
   ==========================================
  */
	static async createPackage(req: Request, res: Response, next: NextFunction) {
		try {
			const files = req.files as Express.Multer.File[];

			if (!files?.length) {
				return res.status(400).json({
					success: false,
					message: 'Package images are required',
				});
			}

			const uploadedImages: { url: string; publicId: string }[] = [];

			for (const file of files) {
				const buffer = file.buffer as Buffer;

				const result = await uploadToCloudinary(buffer, 'packages');

				uploadedImages.push({
					url: result.secure_url,
					publicId: result.public_id,
				});
			}

			const packageData = {
				...((req as any).locals?.data || req.body),
				images: uploadedImages,
			};

			const pkg = await Package.create(packageData);

			return res.status(201).json({
				success: true,
				data: pkg,
			});
		} catch (error) {
			next(error);
		}
	}

	/*
   ==========================================
   GET ALL PACKAGES (PUBLIC)
   ==========================================
  */
	static async getPackages(req: Request, res: Response, next: NextFunction) {
		try {
			const packages = await Package.find({ status: 'active' }).sort({
				createdAt: -1,
			});

			return res.status(200).json({
				success: true,
				count: packages.length,
				data: packages,
			});
		} catch (error) {
			next(error);
		}
	}

	/*
   ==========================================
   GET SINGLE PACKAGE (PUBLIC)
   ==========================================
  */
	static async getPackageById(req: Request, res: Response, next: NextFunction) {
		try {
			const pkg = await Package.findById(req.params.id);

			if (!pkg) {
				return res.status(404).json({
					success: false,
					message: 'Package not found',
				});
			}

			return res.status(200).json({
				success: true,
				data: pkg,
			});
		} catch (error) {
			next(error);
		}
	}

	/*
   ==========================================
   UPDATE PACKAGE
   ==========================================
  */
	static async updatePackage(req: Request, res: Response, next: NextFunction) {
		try {
			const packageId = req.params.id;

			const existingPackage = await Package.findById(packageId);

			if (!existingPackage) {
				return res.status(404).json({
					success: false,
					message: 'Package not found',
				});
			}

			const files = req.files as Express.Multer.File[];

			let images: any = existingPackage.images || [];

			if (files?.length) {
				const uploadedImages: { url: string; publicId: string }[] = [];

				for (const file of files) {
					const buffer = file.buffer as Buffer;

					const result = await uploadToCloudinary(buffer, 'packages');

					uploadedImages.push({
						url: result.secure_url,
						publicId: result.public_id,
					});
				}

				// Append new images to existing images
				images = [...images, ...uploadedImages];
			}

			const updatedData = {
				...((req as any).locals?.data || req.body),
				images,
			};

			const updatedPackage = await Package.findByIdAndUpdate(packageId, { $set: updatedData }, {
				new: true,
				runValidators: true,
			});

			return res.status(200).json({
				success: true,
				data: updatedPackage,
			});
		} catch (error) {
			next(error);
		}
	}

	/*
   ==========================================
   DELETE PACKAGE
   ==========================================
  */
	static async deletePackage(req: Request, res: Response, next: NextFunction) {
		try {
			const packageId = req.params.id;

			const pkg = await Package.findById(packageId);

			if (!pkg) {
				return res.status(404).json({
					success: false,
					message: 'Package not found',
				});
			}

			/*
       Delete Cloudinary Images
      */
			for (const image of pkg.images) {
				await cloudinary.uploader.destroy(image.publicId);
			}

			await Package.findByIdAndDelete(packageId);

			return res.status(200).json({
				success: true,
				message: 'Package deleted successfully',
			});
		} catch (error) {
			next(error);
		}
	}
}
