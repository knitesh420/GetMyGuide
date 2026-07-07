import TripService from '@services/trip';
import { NextFunction, Request, Response } from 'express';
import { Respond } from 'node-be-utilities';
import {
	TripCancelValidationResult,
	TripCompleteValidationResult,
	TripListQueryValidationResult,
	TripMyQueryValidationResult,
	TripStartValidationResult,
} from './trip.validator';

async function start(req: Request, res: Response, next: NextFunction) {
	try {
		const { notes } = req.locals.data as TripStartValidationResult;
		const trip = await TripService.start(req.locals.id!, req.locals.user!.userId, notes);

		return Respond({ res, status: 200, data: trip });
	} catch (error) {
		return next(error);
	}
}

async function complete(req: Request, res: Response, next: NextFunction) {
	try {
		const { completionNotes } = req.locals.data as TripCompleteValidationResult;
		const trip = await TripService.complete(req.locals.id!, req.locals.user!.userId, completionNotes);

		return Respond({ res, status: 200, data: trip });
	} catch (error) {
		return next(error);
	}
}

async function cancel(req: Request, res: Response, next: NextFunction) {
	try {
		const { reason } = req.locals.data as TripCancelValidationResult;
		const trip = await TripService.cancel(req.locals.id!, req.locals.user!.userId, reason);

		return Respond({ res, status: 200, data: trip });
	} catch (error) {
		return next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, status, guideId } = req.locals.data as TripListQueryValidationResult;
		const result = await TripService.getAll({ status, guideId }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMy(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, status } = req.locals.data as TripMyQueryValidationResult;
		const result = await TripService.getMy(req.locals.user!.userId, { status }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMine(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as TripMyQueryValidationResult;
		const result = await TripService.getMyAsTourist(req.locals.user!.userId, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getById(req: Request, res: Response, next: NextFunction) {
	try {
		const trip = await TripService.getById(req.locals.id!, req.locals.user!);
		return Respond({ res, status: 200, data: trip });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	start,
	complete,
	cancel,
	getAll,
	getMy,
	getMine,
	getById,
};

export default Controller;
