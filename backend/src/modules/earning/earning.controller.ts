import EarningService from '@services/earning';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import {
	EarningListQueryValidationResult,
	PayoutCreateValidationResult,
	PayoutListQueryValidationResult,
} from './earning.validator';

async function getMy(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, status } = req.locals.data as EarningListQueryValidationResult;
		const result = await EarningService.getMyEarnings(
			req.locals.user!.userId,
			{ status },
			{ page, limit }
		);

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMySummary(req: Request, res: Response, next: NextFunction) {
	try {
		const summary = await EarningService.summaryFor(req.locals.user!.userId);
		return Respond({ res, status: 200, data: summary });
	} catch (error) {
		return next(error);
	}
}

async function getMyPayouts(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as PayoutListQueryValidationResult;
		const result = await EarningService.getMyPayouts(req.locals.user!.userId, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, status, guideId } = req.locals.data as EarningListQueryValidationResult;
		const result = await EarningService.getAll({ status, guideId }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getPayoutQueue(req: Request, res: Response, next: NextFunction) {
	try {
		const queue = await EarningService.getPayoutQueue();
		return Respond({ res, status: 200, data: queue });
	} catch (error) {
		return next(error);
	}
}

async function createPayout(req: Request, res: Response, next: NextFunction) {
	try {
		const { guideId, earningIds, method, reference, note } = req.locals
			.data as PayoutCreateValidationResult;

		const payout = await EarningService.createPayout({
			guideId,
			earningIds,
			method,
			reference,
			note,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 201, data: payout });
	} catch (error) {
		return next(error);
	}
}

async function getPayouts(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, guideId } = req.locals.data as PayoutListQueryValidationResult;
		const result = await EarningService.getPayouts({ guideId }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getMy,
	getMySummary,
	getMyPayouts,
	getAll,
	getPayoutQueue,
	createPayout,
	getPayouts,
};

export default Controller;
