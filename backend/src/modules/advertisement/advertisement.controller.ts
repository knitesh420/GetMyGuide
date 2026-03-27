import AdvertisementService from '@services/advertisement';
import { Path } from '@config/const';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { BadRequestError, Respond } from 'node-be-utilities';

async function createAdvertisement(req: Request, res: Response, next: NextFunction) {
	try {
		console.log('🎬 createAdvertisement called');
		console.log('📁 req.file:', req.file);
		const videoFile = req.file;

		if (!videoFile) {
			console.log('❌ No video file provided');
			return next(new BadRequestError('Video file is required'));
		}

		console.log('📹 Video file found:', videoFile.filename, 'Type:', videoFile.mimetype);

		if (!videoFile.mimetype.startsWith('video/')) {
			console.log('❌ Invalid file type:', videoFile.mimetype);
			return next(new BadRequestError('Only video files are allowed'));
		}

		// Move video: misc -> advertisements
		const advertisementsDir = path.join(global.__basedir, 'static', 'advertisements');
		const miscDir = path.join(global.__basedir, Path.Misc);

		console.log('📂 Advertisements dir:', advertisementsDir);
		console.log('📂 Misc dir:', miscDir);

		await fs.mkdir(advertisementsDir, { recursive: true });
		console.log('✅ Created advertisements directory');

		await fs.rename(
			path.join(miscDir, videoFile.filename),
			path.join(advertisementsDir, videoFile.filename)
		);
		console.log('✅ Video file moved to advertisements directory');

		const advertisement = await AdvertisementService.createAdvertisement({
			videoFilename: videoFile.filename,
		});

		console.log('✅ Advertisement created in DB:', advertisement);
		return Respond({ res, status: 201, data: advertisement });
	} catch (error) {
		console.error('❌ Error in createAdvertisement:', error);
		return next(error);
	}
}

async function getAdvertisements(req: Request, res: Response, next: NextFunction) {
	try {
		const advertisements = await AdvertisementService.getAdvertisements();
		return Respond({ res, status: 200, data: advertisements });
	} catch (error) {
		return next(error);
	}
}

async function getAllAdvertisements(req: Request, res: Response, next: NextFunction) {
	try {
		const advertisements = await AdvertisementService.getAllAdvertisements();
		return Respond({ res, status: 200, data: advertisements });
	} catch (error) {
		return next(error);
	}
}

async function getAdvertisementById(req: Request, res: Response, next: NextFunction) {
	try {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
		const advertisement = await AdvertisementService.getAdvertisementById(id);
		await AdvertisementService.incrementViews(id);
		return Respond({ res, status: 200, data: advertisement });
	} catch (error) {
		return next(error);
	}
}

async function updateAdvertisement(req: Request, res: Response, next: NextFunction) {
	try {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
		const videoFile = req.file;

		if (!videoFile) {
			return next(new BadRequestError('Video file is required'));
		}

		if (!videoFile.mimetype.startsWith('video/')) {
			return next(new BadRequestError('Only video files are allowed'));
		}

		const currentAd = await AdvertisementService.getAdvertisementById(id);

		const advertisementsDir = path.join(global.__basedir, 'static', 'advertisements');
		const miscDir = path.join(global.__basedir, Path.Misc);

		// Delete old video
		try {
			await fs.unlink(path.join(advertisementsDir, currentAd.videoFilename));
		} catch {
			// Ignore if file doesn't exist
		}

		// Move new video: misc -> advertisements
		await fs.rename(
			path.join(miscDir, videoFile.filename),
			path.join(advertisementsDir, videoFile.filename)
		);

		const updated = await AdvertisementService.updateAdvertisement(id, {
			videoFilename: videoFile.filename,
		});

		return Respond({ res, status: 200, data: updated });
	} catch (error) {
		return next(error);
	}
}

async function toggleActive(req: Request, res: Response, next: NextFunction) {
	try {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
		const updated = await AdvertisementService.toggleActive(id);
		return Respond({ res, status: 200, data: updated });
	} catch (error) {
		return next(error);
	}
}

async function deleteAdvertisement(req: Request, res: Response, next: NextFunction) {
	try {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
		const advertisement = await AdvertisementService.getAdvertisementById(id);

		const advertisementsDir = path.join(global.__basedir, 'static', 'advertisements');

		try {
			await fs.unlink(path.join(advertisementsDir, advertisement.videoFilename));
		} catch {
			// Ignore if file doesn't exist
		}

		await AdvertisementService.deleteAdvertisement(id);

		return Respond({ res, status: 200, data: { message: 'Advertisement deleted successfully' } });
	} catch (error) {
		return next(error);
	}
}

export default {
	createAdvertisement,
	getAdvertisements,
	getAllAdvertisements,
	getAdvertisementById,
	updateAdvertisement,
	toggleActive,
	deleteAdvertisement,
};
