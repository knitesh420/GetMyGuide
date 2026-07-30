import MessageService from '@services/message';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import {
	MessageSendValidationResult,
	MessageThreadListQueryValidationResult,
	MessageThreadQueryValidationResult,
} from './message.validator';

async function getThread(req: Request, res: Response, next: NextFunction) {
	try {
		const { after, limit } = req.locals.data as MessageThreadQueryValidationResult;
		const messages = await MessageService.getThread(req.locals.id!, req.locals.user!, {
			after,
			limit,
		});

		return Respond({ res, status: 200, data: messages });
	} catch (error) {
		return next(error);
	}
}

async function send(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.locals.data as MessageSendValidationResult;
		const message = await MessageService.send({
			bookingId: req.locals.id!,
			user: req.locals.user!,
			body,
		});

		return Respond({ res, status: 201, data: message });
	} catch (error) {
		return next(error);
	}
}

async function markRead(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await MessageService.markThreadRead(req.locals.id!, req.locals.user!.userId);
		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await MessageService.getUnreadCount(req.locals.user!);
		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getThreads(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit } = req.locals.data as MessageThreadListQueryValidationResult;
		const result = await MessageService.getThreads(req.locals.user!, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getThread,
	send,
	markRead,
	getUnreadCount,
	getThreads,
};

export default Controller;
