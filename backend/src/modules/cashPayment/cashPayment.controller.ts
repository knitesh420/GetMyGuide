import CashPaymentService from '@services/cashPayment';
import { Respond } from '@utils/respond';
import { NextFunction, Request, Response } from 'express';
import {
	CashPaymentCreateValidationResult,
	CashPaymentListQueryValidationResult,
	CashPaymentUpdateValidationResult,
	CashPaymentVoidValidationResult,
} from './cashPayment.validator';

// ---- Guide: own payment history -------------------------------------------

async function getMy(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as CashPaymentListQueryValidationResult;
		const result = await CashPaymentService.getMy(req.locals.user!.userId, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

// ---- Admin ----------------------------------------------------------------

async function create(req: Request, res: Response, next: NextFunction) {
	try {
		const { guideId, ...data } = req.locals.data as CashPaymentCreateValidationResult;

		const payment = await CashPaymentService.create({
			guideAccountId: guideId,
			data,
			// Recorded By, taken from the session — never from the request body.
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 201, data: payment });
	} catch (error) {
		return next(error);
	}
}

async function update(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as CashPaymentUpdateValidationResult;

		const payment = await CashPaymentService.update({
			paymentId: req.params.id as string,
			data,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 200, data: payment });
	} catch (error) {
		return next(error);
	}
}

/** Soft delete: the row is voided, never removed — the audit trail must survive. */
async function remove(req: Request, res: Response, next: NextFunction) {
	try {
		const { reason } = req.locals.data as CashPaymentVoidValidationResult;

		const payment = await CashPaymentService.void({
			paymentId: req.params.id as string,
			reason,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 200, data: payment });
	} catch (error) {
		return next(error);
	}
}

/** Every cash record for one guide, voided ones included. */
async function getForGuide(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as CashPaymentListQueryValidationResult;
		const result = await CashPaymentService.getForGuide(req.params.id as string, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, guideId, status } = req.locals
			.data as CashPaymentListQueryValidationResult;
		const result = await CashPaymentService.getAll({ guideId, status }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getMy,
	create,
	update,
	remove,
	getForGuide,
	getAll,
};

export default Controller;
