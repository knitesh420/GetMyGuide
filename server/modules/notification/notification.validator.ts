import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import {
	notificationAdminListQuerySchema,
	notificationListQuerySchema,
} from './notification.schema';

/**
 * The schemas themselves now live in ./notification.schema.ts so the native
 * Route Handlers can share them. These wrappers keep the Express middleware
 * signature for as long as the adapter still serves this module.
 */

export type NotificationListValidationResult = {
	page: number;
	limit: number;
	unreadOnly: boolean;
};

export async function NotificationListValidator(req: Request, res: Response, next: NextFunction) {
	return handle(notificationListQuerySchema.safeParse(req.query), req, next);
}

export type NotificationAdminListValidationResult = {
	page: number;
	limit: number;
	type?: string;
	recipient?: string;
};

export async function NotificationAdminListValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	return handle(notificationAdminListQuerySchema.safeParse(req.query), req, next);
}
