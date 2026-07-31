import { BadRequestError } from 'node-be-utilities';
import type { z } from 'zod';

import { connectToDatabase } from '@mongo/connection';
import { respondError } from './respond';

/**
 * Shared plumbing for native Route Handlers.
 *
 * Every handler needs the same three things the Express stack gave it for free:
 * a live database connection, errors turned into the project's JSON error
 * shape, and validated input. Doing it here keeps each route file down to the
 * part that is actually specific to that route.
 */

export type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;

export interface RouteContext {
	params: Record<string, string>;
}

/**
 * Wrap a handler: connect, run, and convert any throw into the same error
 * envelope node-be-utilities' errorHandler produced.
 *
 * Handlers therefore `throw new UnauthorizedError(...)` exactly like the
 * controllers did with `next(err)`, and the wire format is unchanged.
 */
export function createHandler(handler: RouteHandler) {
	return async (
		request: Request,
		context?: { params?: Promise<Record<string, string>> | Record<string, string> }
	): Promise<Response> => {
		try {
			await connectToDatabase();
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error('Database connection failed', err);
			return respondError(
				Object.assign(new Error('Service temporarily unavailable'), {
					status: 503,
					title: 'SERVICE_UNAVAILABLE',
					serializeError: () => ({
						title: 'SERVICE_UNAVAILABLE',
						message: 'Service temporarily unavailable',
						status: 503,
					}),
				})
			);
		}

		try {
			// Next 15+ hands params as a promise; older shapes pass it directly.
			const params = (await context?.params) ?? {};
			return await handler(request, { params });
		} catch (err) {
			return respondError(err);
		}
	};
}

/**
 * Read the JSON body without validating it.
 *
 * Separate from validation because the Express middleware chain ran the rate
 * limiter BEFORE the validator, and the OTP limiters key on `req.body.email`.
 * That ordering is deliberate — an invalid payload still consumes quota, so a
 * malformed-body loop can't be used to bypass the limit — and a Request body
 * can only be read once, so the raw object has to be parsed up front and passed
 * to both steps.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		// An unparseable body must read as a validation failure, not a 500. The
		// Express json parser produced a 400 here too.
		return undefined;
	}
}

/** Flatten zod issues exactly as handleValidation did, and throw a 400. */
function toBadRequest(error: z.ZodError): never {
	const message = error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join(', ');

	throw new BadRequestError(message);
}

/**
 * Validate an already-parsed body against a zod schema.
 *
 * Reproduces `handleValidation` in server/utils/validate.ts, including the way
 * issues are flattened into one comma-separated message — the frontend surfaces
 * that string directly, so its format is part of the contract.
 */
export function validateBody<T>(raw: unknown, schema: z.ZodType<T>): T {
	const result = schema.safeParse(raw);
	if (result.success) return result.data;
	return toBadRequest(result.error);
}

/** Convenience for routes with no rate limiter: read and validate in one step. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
	return validateBody(await readJsonBody(request), schema);
}

/** Same, for query-string input. */
export function parseQuery<T>(request: Request, schema: z.ZodType<T>): T {
	const params = Object.fromEntries(new URL(request.url).searchParams.entries());
	const result = schema.safeParse(params);

	if (result.success) {
		return result.data;
	}

	const message = result.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join(', ');

	throw new BadRequestError(message);
}
