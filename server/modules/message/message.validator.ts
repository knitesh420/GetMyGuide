import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import {
	messageSendSchema,
	messageThreadListQuerySchema,
	messageThreadQuerySchema,
} from './message.schema';

/**
 * The schemas themselves now live in ./message.schema.ts so the native Route
 * Handlers can share them. These wrappers keep the Express middleware signature
 * for as long as the adapter still serves this module.
 */

export type MessageSendValidationResult = {
	body: string;
};

export async function MessageSendValidator(req: Request, res: Response, next: NextFunction) {
	return handle(messageSendSchema.safeParse(req.body), req, next);
}

export type MessageThreadQueryValidationResult = {
	after?: string;
	limit: number;
};

export async function MessageThreadQueryValidator(req: Request, res: Response, next: NextFunction) {
	return handle(messageThreadQuerySchema.safeParse(req.query), req, next);
}

export type MessageThreadListQueryValidationResult = {
	page: number;
	limit: number;
};

export async function MessageThreadListQueryValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	return handle(messageThreadListQuerySchema.safeParse(req.query), req, next);
}
