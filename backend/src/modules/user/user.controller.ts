import UserService from './user.service';
import { NextFunction, Request, Response } from 'express';
import { Respond } from 'node-be-utilities';

async function getAllTourists(req: Request, res: Response, next: NextFunction) {
	try {
		const query = req.query.search as string | undefined;
		const limit = parseInt(req.query.limit as string) || 10;
		const page = parseInt(req.query.page as string) || 1;

		const result = await UserService.getAllTourists(query, limit, page);

		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function deleteTourist(req: Request, res: Response, next: NextFunction) {
	try {
		const touristId = req.locals.id!;

		const result = await UserService.deactivateTourist(touristId);

		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function activateTourist(req: Request, res: Response, next: NextFunction) {
	try {
		const touristId = req.locals.id!;

		const result = await UserService.activateTourist(touristId);

		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getAllTourists,
	deleteTourist,
	activateTourist,
};

export default Controller;
