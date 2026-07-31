import type { Types } from 'mongoose';
import { BadRequestError, idValidator } from 'node-be-utilities';

/**
 * Next-native port of `server/middleware/idValidator.ts`.
 *
 * Uses the same `idValidator` from node-be-utilities the Express middleware
 * used, so an id that was accepted (or rejected) before is treated identically
 * now — including whatever normalisation it applies. Re-implementing the check
 * with a hand-rolled ObjectId regex would be the obvious shortcut and would
 * quietly change which inputs are accepted.
 *
 * Returns an ObjectId, not a string: that is exactly what the middleware put on
 * `req.locals.id` (typed IDType = Types.ObjectId), and the controllers pass it
 * straight into service calls. Handing back a string instead would work for
 * most Mongoose queries and then fail somewhere subtle, like an aggregation
 * $match that does not cast.
 */
export function validateId(id: string | undefined): Types.ObjectId {
	const [ok, value] = idValidator(id);

	if (ok) {
		return value;
	}

	throw new BadRequestError('Invalid ID');
}

/**
 * The same check where the caller genuinely wants the string form — the
 * controllers that read `req.params.id` directly rather than `req.locals.id`.
 */
export function validateIdString(id: string | undefined): string {
	return validateId(id).toString();
}
