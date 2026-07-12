import TouristService from '@services/tourist';
import TouristDashboardService from '@services/touristDashboard';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { Respond } from '@utils/respond';
import { TouristProfileValidationResult } from './tourist.validator';

async function getTouristProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const profile = await TouristService.getTouristProfile(user.userId);

		return Respond({
			res,
			status: 200,
			data: profile,
		});
	} catch (error) {
		return next(error);
	}
}

async function updateTouristProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const data = req.locals.data as TouristProfileValidationResult;
		const profile = await TouristService.upsertTouristProfile(user.userId, data);

		return Respond({
			res,
			status: 200,
			data: profile,
		});
	} catch (error) {
		return next(error);
	}
}

// Everything the tourist Dashboard Home renders, in a single read: profile,
// stats, upcoming trip, recent bookings/trips, notifications, payments, pending
// reviews and the activity feed. Lets the page load with one request instead of
// fanning out to the five list endpoints and over-fetching each.
async function getTouristDashboard(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const overview = await TouristDashboardService.getOverview(user.userId);

		return Respond({
			res,
			status: 200,
			data: overview,
		});
	} catch (error) {
		return next(error);
	}
}

async function getAllTouristsForAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const tourists = await TouristService.getAllTouristsForAdmin();

		// Wrap the array under `data`: Respond() spreads its `data` onto the top
		// level of the body, so a bare array must not be passed straight to it.
		return Respond({
			res,
			status: 200,
			data: { data: tourists },
		});
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getTouristProfile,
	updateTouristProfile,
	getTouristDashboard,
	getAllTouristsForAdmin,
};

export default Controller;
