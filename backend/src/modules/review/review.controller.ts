import ReviewService from '@services/review';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import {
	ReviewCreateValidationResult,
	ReviewHideValidationResult,
	ReviewListQueryValidationResult,
	ReviewMyQueryValidationResult,
} from './review.validator';

async function createReview(req: Request, res: Response, next: NextFunction) {
	try {
		const { bookingId, rating, comment } = req.locals.data as ReviewCreateValidationResult;
		const review = await ReviewService.createReview({
			bookingId,
			touristUserId: req.locals.user!.userId,
			rating,
			comment,
		});

		return Respond({ res, status: 201, data: review });
	} catch (error) {
		return next(error);
	}
}

async function getPublicGuideReviews(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await ReviewService.getPublicGuideReviews(req.params.guideId as string);
		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMyReviews(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as ReviewMyQueryValidationResult;
		const result = await ReviewService.getMyReviews(req.locals.user!.userId, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMineAsGuide(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as ReviewMyQueryValidationResult;
		const result = await ReviewService.getMineAsGuide(req.locals.user!.userId, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getAllForAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, guideId, minRating, isHidden } = req.locals.data as ReviewListQueryValidationResult;
		const result = await ReviewService.getAllForAdmin({ guideId, minRating, isHidden }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function setHidden(req: Request, res: Response, next: NextFunction) {
	try {
		const { isHidden } = req.locals.data as ReviewHideValidationResult;
		const review = await ReviewService.setHidden(req.locals.id!, isHidden, req.locals.user!.userId);

		return Respond({ res, status: 200, data: review });
	} catch (error) {
		return next(error);
	}
}

async function deleteReview(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await ReviewService.deleteReview(req.locals.id!, req.locals.user!.userId);
		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	createReview,
	getPublicGuideReviews,
	getMyReviews,
	getMineAsGuide,
	getAllForAdmin,
	setHidden,
	deleteReview,
};

export default Controller;
