import UserService from './user.service';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
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

async function getMe(req: Request, res: Response, next: NextFunction) {
	try {
		const account = await UserService.getMe(req.locals.user!.userId);

		return Respond({
			res,
			status: 200,
			data: account,
		});
	} catch (error) {
		return next(error);
	}
}

async function getAllAccounts(req: Request, res: Response, next: NextFunction) {
	try {
		const role = req.query.role as 'tourist' | 'guide' | 'admin' | undefined;
		const search = (req.query.search as string) || (req.query.query as string) || undefined;
		const limit = parseInt(req.query.limit as string) || 20;
		const page = parseInt(req.query.page as string) || 1;

		const result = await UserService.getAllAccounts({ role, search }, limit, page);

		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function getAccountsByRole(req: Request, res: Response, next: NextFunction) {
	try {
		const role = req.params.role as 'tourist' | 'guide' | 'admin';
		const limit = parseInt(req.query.limit as string) || 20;
		const page = parseInt(req.query.page as string) || 1;

		const result = await UserService.getAccountsByRole(role, limit, page);

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
	getMe,
	getAllAccounts,
	getAccountsByRole,
};

export default Controller;
