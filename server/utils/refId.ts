import { Types } from 'mongoose';

/**
 * A reference that has been populated. The index signature is deliberate: a
 * populated document carries whatever fields the `.populate()` projection asked
 * for, and without it every real caller trips TypeScript's excess-property
 * check and gets pushed into casting — which is how a helper meant to prevent a
 * type-shaped bug ends up bypassed.
 */
type PopulatedRef = { _id?: Types.ObjectId | string; [key: string]: unknown };

/**
 * Read the id out of a Mongoose reference field, whether or not it has been
 * populated.
 *
 * This exists because of a real bug. An authorisation guard compared a
 * reference to a user id with `booking.allocated_guide?.toString()`, which is
 * correct for a raw ObjectId — but a read path elsewhere in the same service
 * later added `.populate('allocated_guide', …)`, and a populated field is a
 * document, whose `toString()` is `'[object Object]'`. The comparison then
 * silently never matched, and the allocated guide was refused their own
 * booking. Nothing failed loudly; a permission check just quietly always said
 * no. (Had the guard been the other way round — "deny if equal" — the same slip
 * would have quietly always said YES.)
 *
 * The lesson is that the guard cannot assume anything about how its caller
 * fetched the document, because those two facts live far apart and the caller
 * has every right to change. So compare through this rather than reaching for
 * `.toString()` on a ref.
 *
 * Returns undefined for a missing ref, so an absent value never compares equal
 * to a real id.
 */
export function refId(
	value: Types.ObjectId | string | PopulatedRef | null | undefined
): string | undefined {
	if (value === null || value === undefined) return undefined;

	if (typeof value === 'string') return value;

	// A populated document — take its _id. Checked before the ObjectId branch
	// because an ObjectId has no own `_id`, so the order is unambiguous.
	if (typeof value === 'object' && '_id' in value && value._id) {
		return value._id.toString();
	}

	return value.toString();
}

/** True when a reference points at `userId`, populated or not. */
export function refEquals(
	value: Types.ObjectId | string | PopulatedRef | null | undefined,
	userId: string | undefined
): boolean {
	if (!userId) return false;
	const id = refId(value);
	return id !== undefined && id === userId;
}
