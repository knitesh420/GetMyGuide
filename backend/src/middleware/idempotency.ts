import IdempotencyKeyDB from '@mongo/repo/IdempotencyKey';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';

/**
 * Idempotency middleware — prevents duplicate payment-related requests.
 *
 * Reads `x-idempotency-key` from headers.
 * - If key+endpoint already exists with matching request hash → returns stored response.
 * - If not → allows request through and stores the response for future dedup.
 */
export default function idempotency(req: Request, res: Response, next: NextFunction) {
	const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

	if (!idempotencyKey) {
		return next(new BadRequestError('x-idempotency-key header is required'));
	}

	const endpoint = `${req.method}:${req.originalUrl}`;
	const requestHash = crypto
		.createHash('sha256')
		.update(JSON.stringify(req.body || {}))
		.digest('hex');

	// Check for existing idempotency record
	IdempotencyKeyDB.findOne({ key: idempotencyKey, endpoint })
		.then((existing: any) => {
			if (existing) {
				// Key exists — check if request hash matches
				if (existing.requestHash !== requestHash) {
					return next(
						new BadRequestError(
							'Idempotency key already used with a different request body'
						)
					);
				}

				// Return the stored response
				return res.status(existing.response.statusCode).json(existing.response.body);
			}

			// Key does not exist — intercept the response to capture and store it
			const originalJson = res.json.bind(res);

			res.json = function (body: any) {
				// Store the response asynchronously — don't block the response
				IdempotencyKeyDB.create({
					key: idempotencyKey,
					endpoint,
					requestHash,
					response: {
						statusCode: res.statusCode,
						body,
					},
				}).catch(() => {
					// Silently fail — idempotency storage is best-effort
				});

				return originalJson(body);
			};

			return next();
		})
		.catch((err: any) => {
			return next(err);
		});
}
