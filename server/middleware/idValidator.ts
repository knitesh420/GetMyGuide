import { NextFunction, Request, Response } from 'express';
import { BadRequestError, idValidator } from 'node-be-utilities';

export default async function IDValidator(req: Request, res: Response, next: NextFunction) {
	const [validationResult, validationResult_data] = idValidator(req.params.id as string);
	if (validationResult) {
		req.locals.id = validationResult_data;
		return next();
	}

	return next(new BadRequestError('Invalid ID'));
}
