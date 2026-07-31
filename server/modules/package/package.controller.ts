import { Request, Response, NextFunction } from 'express';
import Package from './package.schema';
import { toPackageObjectId as toObjectId } from './package.input';
import uploadToCloudinary from '../../utils/cloudinaryUpload';
import cloudinary from '../../config/cloudinary';

/**
 * A malformed id is a client error, not a missing resource — 400, matching what
 * the shared IDValidator middleware returns for every other module's `:id`
 * routes. Previously it reached Mongoose and came back as a CastError 500.
 */
function badId(res: Response) {
	return res.status(400).json({
		success: false,
		message: 'Invalid ID',
	});
}

function notFound(res: Response) {
	return res.status(404).json({
		success: false,
		message: 'Package not found',
	});
}

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
			// The frontend has always sent `?featured=true&limit=N` here — the
			// "Recommended tours" rail on /tours/[id] asks for 8 featured packages —
			// but this handler ignored the query string entirely and answered with
			// every active package. The rail therefore showed non-featured tours,
			// and each tour-page view downloaded the whole catalogue (full
			// description HTML for every package) to render at most eight cards.
			//
			// Both parameters are optional and the no-parameter response is byte-for-
			// byte what it was before, so existing callers are unaffected.
			const query: Record<string, unknown> = { status: 'active' };

			if (req.query.featured === 'true') {
				query.featured = true;
			}

			// Clamped rather than trusted: an unbounded client-supplied limit is a
			// cheap way to force a full-collection scan and response.
			const rawLimit = Number(req.query.limit);
			const limit =
				Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 0;

			let cursor = Package.find(query).sort({ createdAt: -1 });
			if (limit > 0) {
				cursor = cursor.limit(limit);
			}
			const packages = await cursor;

			return res.status(200).json({
				success: true,
				count: packages.length,
				data: packages,
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Every package, including the inactive ones the public listing filters out.
	 * The admin panel needs those: without them, switching a service to `inactive`
	 * would remove it from the admin's own table and there would be no way left to
	 * switch it back on.
	 */
	static async getAllPackagesForAdmin(req: Request, res: Response, next: NextFunction) {
		try {
			const packages = await Package.find({}).sort({ createdAt: -1 });

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
			const packageId = toObjectId(req.params.id);
			if (!packageId) return badId(res);

			// This route is public (no VerifySession), so it must apply the same
			// `status: 'active'` filter the public listing does. It previously ran a
			// bare findById, which meant a package an admin had switched to
			// 'inactive' — deliberately withdrawn from sale — stayed fully readable
			// to anyone who knew or guessed its id, price and description included.
			//
			// Admin reads are unaffected: the admin panel loads packages from
			// GET /package/admin/all and edits from that already-fetched row, so
			// nothing authenticated depends on this handler returning inactive ones.
			const pkg = await Package.findOne({ _id: packageId, status: 'active' });

			if (!pkg) return notFound(res);

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
			const packageId = toObjectId(req.params.id);
			if (!packageId) return badId(res);

			const existingPackage = await Package.findById(packageId);

			if (!existingPackage) return notFound(res);

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
			const packageId = toObjectId(req.params.id);
			if (!packageId) return badId(res);

			const pkg = await Package.findById(packageId);

			if (!pkg) return notFound(res);

			// Delete the document first, then clean up its Cloudinary assets.
			//
			// The original order was the reverse, which made a Cloudinary outage
			// destructive-but-incomplete: the images were destroyed, the destroy call
			// for a later image threw, and the package document survived — leaving a
			// live package whose images all 404. Removing the record first means the
			// worst case is an orphaned Cloudinary asset (costs storage, breaks
			// nothing) instead of a visibly broken package.
			await Package.findByIdAndDelete(packageId);

			for (const image of pkg.images) {
				try {
					await cloudinary.uploader.destroy(image.publicId);
				} catch {
					// Best-effort: the package is already gone, so a failed asset
					// cleanup must not turn a successful delete into a 500.
				}
			}

			return res.status(200).json({
				success: true,
				message: 'Package deleted successfully',
			});
		} catch (error) {
			next(error);
		}
	}
}
