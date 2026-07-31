import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';

import { parseCreatePackage, parseStatusUpdate, parseUpdatePackage } from './package.input';

/**
 * The parsing rules themselves now live in ./package.input.ts so the native
 * Route Handlers can share them. These wrappers keep the Express middleware
 * signature for as long as the adapter still serves this module.
 */

export async function CreatePackageValidator(req: Request, _res: Response, next: NextFunction) {
	const result = parseCreatePackage(req.body);
	if (!result.ok) return next(new BadRequestError(result.message));

	req.locals = req.locals || {};
	req.locals.data = result.data;
	return next();
}

export async function UpdatePackageValidator(req: Request, _res: Response, next: NextFunction) {
	const result = parseUpdatePackage(req.body);
	if (!result.ok) return next(new BadRequestError(result.message));

	req.locals = req.locals || {};
	req.locals.data = result.data;
	return next();
}

export async function UpdateStatusValidator(req: Request, _res: Response, next: NextFunction) {
	const result = parseStatusUpdate(req.body);
	if (!result.ok) return next(new BadRequestError(result.message));

	req.locals = req.locals || {};
	req.locals.data = result.data;
	return next();
}

export default {} as any;
