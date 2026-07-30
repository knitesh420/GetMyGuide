import BalancePaymentService from '@services/balancePayment';
import RefundService from '@services/refund';
import TourGuideService from '@services/tourguide';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import {
	PaymentVerifyValidationResult,
	TourGuideCancelValidationResult,
	TourGuideCreateOrderValidationResult,
	TourGuideListQueryValidationResult,
	TourGuideQuoteValidationResult,
	TourGuideReassignValidationResult,
	TourGuideStatusValidationResult,
	TourGuideVerifyValidationResult,
} from './tourguide.validator';

async function getQuote(req: Request, res: Response, next: NextFunction) {
	try {
		const { guideId, startDate, endDate } = req.locals.data as TourGuideQuoteValidationResult;
		const quote = await TourGuideService.quote({ guideId, startDate, endDate });

		return Respond({ res, status: 200, data: quote });
	} catch (error) {
		return next(error);
	}
}

async function createOrder(req: Request, res: Response, next: NextFunction) {
	try {
		const input = req.locals.data as TourGuideCreateOrderValidationResult;
		const order = await TourGuideService.createOrder(input, req.locals.user!);

		return Respond({ res, status: 200, data: order });
	} catch (error) {
		return next(error);
	}
}

async function verifyAndCreate(req: Request, res: Response, next: NextFunction) {
	try {
		const payload = req.locals.data as TourGuideVerifyValidationResult;
		const booking = await TourGuideService.verifyAndCreate({
			...payload,
			user: req.locals.user!,
		});

		return Respond({ res, status: 201, data: booking });
	} catch (error) {
		return next(error);
	}
}

async function getUserBookings(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as TourGuideListQueryValidationResult;
		const result = await TourGuideService.getUserBookings(req.locals.user!, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as TourGuideListQueryValidationResult;
		const result = await TourGuideService.getAll({ page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMyGuideBookings(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as TourGuideListQueryValidationResult;
		const result = await TourGuideService.getMyGuideBookings(req.locals.user!.userId, {
			page,
			limit,
		});

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMyGuideBookingById(req: Request, res: Response, next: NextFunction) {
	try {
		const booking = await TourGuideService.getMyGuideBookingById(
			req.locals.user!.userId,
			req.locals.id!
		);

		return Respond({ res, status: 200, data: booking });
	} catch (error) {
		return next(error);
	}
}

async function getById(req: Request, res: Response, next: NextFunction) {
	try {
		const booking = await TourGuideService.getById(req.locals.id!, req.locals.user!);
		return Respond({ res, status: 200, data: booking });
	} catch (error) {
		return next(error);
	}
}

async function updateStatus(req: Request, res: Response, next: NextFunction) {
	try {
		const { status } = req.locals.data as TourGuideStatusValidationResult;
		const booking = await TourGuideService.updateStatus(
			req.locals.id!,
			status,
			req.locals.user!.userId
		);

		return Respond({ res, status: 200, data: booking });
	} catch (error) {
		return next(error);
	}
}

/**
 * Cancelling never cancels on the spot — it opens a request an admin decides on,
 * including for admins themselves, so that every refund goes through one place
 * where the amount is set explicitly.
 */
async function cancel(req: Request, res: Response, next: NextFunction) {
	try {
		const { reason } = req.locals.data as TourGuideCancelValidationResult;
		const request = await RefundService.requestCancellation({
			bookingId: req.locals.id!.toString(),
			user: req.locals.user!,
			reason,
		});

		return Respond({ res, status: 201, data: request });
	} catch (error) {
		return next(error);
	}
}

async function reassignGuide(req: Request, res: Response, next: NextFunction) {
	try {
		const { newGuideId } = req.locals.data as TourGuideReassignValidationResult;
		const booking = await TourGuideService.reassignGuide({
			bookingId: req.locals.id!,
			newGuideId,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 200, data: booking });
	} catch (error) {
		return next(error);
	}
}

async function createFinalOrder(req: Request, res: Response, next: NextFunction) {
	try {
		const order = await BalancePaymentService.createOrder(req.locals.id!, req.locals.user!);
		return Respond({ res, status: 200, data: order });
	} catch (error) {
		return next(error);
	}
}

async function verifyFinalPayment(req: Request, res: Response, next: NextFunction) {
	try {
		const payload = req.locals.data as PaymentVerifyValidationResult;
		const booking = await BalancePaymentService.verify(req.locals.id!, payload, req.locals.user!);

		return Respond({ res, status: 200, data: booking });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getQuote,
	createOrder,
	verifyAndCreate,
	getUserBookings,
	getAll,
	getMyGuideBookings,
	getMyGuideBookingById,
	getById,
	updateStatus,
	cancel,
	reassignGuide,
	createFinalOrder,
	verifyFinalPayment,
};

export default Controller;
