import RefundService from '@services/refund';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import {
	RefundApproveValidationResult,
	RefundListQueryValidationResult,
	RefundRejectValidationResult,
	RefundRequestValidationResult,
} from './refund.validator';

async function requestCancellation(req: Request, res: Response, next: NextFunction) {
	try {
		const { bookingId, reason } = req.locals.data as RefundRequestValidationResult;
		const request = await RefundService.requestCancellation({
			bookingId,
			user: req.locals.user!,
			reason,
		});

		return Respond({ res, status: 201, data: request });
	} catch (error) {
		return next(error);
	}
}

async function approve(req: Request, res: Response, next: NextFunction) {
	try {
		const { approvedAmount, adminNote } = req.locals.data as RefundApproveValidationResult;
		const request = await RefundService.approve({
			refundId: req.locals.id!,
			approvedAmount,
			adminNote,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 200, data: request });
	} catch (error) {
		return next(error);
	}
}

async function reject(req: Request, res: Response, next: NextFunction) {
	try {
		const { adminNote } = req.locals.data as RefundRejectValidationResult;
		const request = await RefundService.reject({
			refundId: req.locals.id!,
			adminNote,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 200, data: request });
	} catch (error) {
		return next(error);
	}
}

async function retry(req: Request, res: Response, next: NextFunction) {
	try {
		const request = await RefundService.retry({
			refundId: req.locals.id!,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 200, data: request });
	} catch (error) {
		return next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, status } = req.locals.data as RefundListQueryValidationResult;
		const result = await RefundService.getAll({ status }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMy(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as RefundListQueryValidationResult;
		const result = await RefundService.getMy(req.locals.user!.userId, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getById(req: Request, res: Response, next: NextFunction) {
	try {
		const request = await RefundService.getById(req.locals.id!, req.locals.user!);
		return Respond({ res, status: 200, data: request });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	requestCancellation,
	approve,
	reject,
	retry,
	getAll,
	getMy,
	getById,
};

export default Controller;
