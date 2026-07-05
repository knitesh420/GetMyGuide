import NotificationService from '@services/notification';
import { NextFunction, Request, Response } from 'express';
import { Respond } from 'node-be-utilities';
import {
	NotificationAdminListValidationResult,
	NotificationListValidationResult,
} from './notification.validator';

async function getMyNotifications(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, unreadOnly } = req.locals.data as NotificationListValidationResult;
		const result = await NotificationService.getMyNotifications(req.locals.user!.userId, {
			page,
			limit,
			unreadOnly,
		});

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMyUnreadCount(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await NotificationService.getUnreadCount(req.locals.user!.userId);
		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function markRead(req: Request, res: Response, next: NextFunction) {
	try {
		const notification = await NotificationService.markRead(req.locals.user!.userId, req.locals.id!);
		return Respond({ res, status: 200, data: notification });
	} catch (error) {
		return next(error);
	}
}

async function markAllRead(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await NotificationService.markAllRead(req.locals.user!.userId);
		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getAllForAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, type, recipient } = req.locals.data as NotificationAdminListValidationResult;
		const result = await NotificationService.getAllForAdmin({ type: type as any, recipient }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	getMyNotifications,
	getMyUnreadCount,
	markRead,
	markAllRead,
	getAllForAdmin,
};

export default Controller;
