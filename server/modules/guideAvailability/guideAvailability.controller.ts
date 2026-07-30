import GuideAvailabilityService from '@services/guideAvailability';
import { startOfDay, endOfDay } from '@utils/bookingOccupiedRange';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { Respond } from '@utils/respond';
import { CreateLeaveValidationResult, GuidesAvailabilityQueryValidationResult } from './guideAvailability.validator';

async function createLeave(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const data = req.locals.data as CreateLeaveValidationResult;
		const leave = await GuideAvailabilityService.createLeave(user.userId, data);

		return Respond({ res, status: 201, data: leave });
	} catch (error) {
		return next(error);
	}
}

async function getMyLeaves(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const leaves = await GuideAvailabilityService.getMyLeaves(user.userId);
		// Wrap the array under `data`: Respond() spreads its `data` onto the top
		// level of the body, which would destroy a bare array (turning it into an
		// object with numeric keys). Nesting keeps it a real array on the client
		// as response.data.
		return Respond({ res, status: 200, data: { data: leaves } });
	} catch (error) {
		return next(error);
	}
}

async function cancelLeave(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const leave = await GuideAvailabilityService.cancelLeave(user.userId, req.locals.id!);
		return Respond({ res, status: 200, data: leave });
	} catch (error) {
		return next(error);
	}
}

async function getMyCalendar(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const calendar = await GuideAvailabilityService.getGuideCalendar(user.userId);
		return Respond({ res, status: 200, data: calendar });
	} catch (error) {
		return next(error);
	}
}

async function getGuideCalendar(req: Request, res: Response, next: NextFunction) {
	try {
		const guideId = req.locals.id!;
		const calendar = await GuideAvailabilityService.getGuideCalendar(guideId.toString());
		return Respond({ res, status: 200, data: calendar });
	} catch (error) {
		return next(error);
	}
}

async function getGuidesAvailability(req: Request, res: Response, next: NextFunction) {
	try {
		const { startDate, endDate } = req.locals.data as GuidesAvailabilityQueryValidationResult;

		const range = {
			start: startOfDay(new Date(startDate)),
			end: endOfDay(new Date(endDate || startDate)),
		};

		const guides = await GuideAvailabilityService.getGuidesAvailability(range);
		// Wrap the array under `data` — see getMyLeaves above for why a bare
		// array must not be passed straight to Respond().
		return Respond({ res, status: 200, data: { data: guides } });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	createLeave,
	getMyLeaves,
	cancelLeave,
	getMyCalendar,
	getGuideCalendar,
	getGuidesAvailability,
};

export default Controller;
