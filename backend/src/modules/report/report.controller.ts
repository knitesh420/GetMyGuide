import ReportService from '@services/report';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import {
	ActivityLogQueryValidationResult,
	BookingsTrendValidationResult,
	GuidePerformanceValidationResult,
} from './report.validator';

async function getOverview(req: Request, res: Response, next: NextFunction) {
	try {
		const overview = await ReportService.getOverview();
		return Respond({ res, status: 200, data: overview });
	} catch (error) {
		return next(error);
	}
}

async function getBookingsTrend(req: Request, res: Response, next: NextFunction) {
	try {
		const { range } = req.locals.data as BookingsTrendValidationResult;
		const trend = await ReportService.getBookingsTrend(range);

		return Respond({ res, status: 200, data: trend });
	} catch (error) {
		return next(error);
	}
}

async function getGuidePerformance(req: Request, res: Response, next: NextFunction) {
	try {
		const { limit } = req.locals.data as GuidePerformanceValidationResult;
		const rows = await ReportService.getGuidePerformance(limit);

		return Respond({ res, status: 200, data: rows });
	} catch (error) {
		return next(error);
	}
}

async function getActivityLog(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, action, actorType, from, to } = req.locals.data as ActivityLogQueryValidationResult;
		const result = await ReportService.getActivityLog({ action, actorType, from, to }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getOverview,
	getBookingsTrend,
	getGuidePerformance,
	getActivityLog,
};

export default Controller;
