import { Respond as BaseRespond } from 'node-be-utilities';

/** Borrowed from the library so the status union and payload type stay in step with it. */
type RespondArgs = Parameters<typeof BaseRespond>[0];

/**
 * node-be-utilities answers with `res.json({ ...data, success })` — it *spreads*
 * the payload onto the response root.
 *
 * Spreading a Mongoose document does not copy its fields. A document's own
 * enumerable properties are its internals, so `{ ...doc }` is `{ $__, _doc }`
 * and every real field (`status`, `_id`, `amount`, …) is left behind on the
 * prototype. Controllers handing a live document straight to Respond were
 * therefore serialising
 *
 *     {"$__":{"activePaths":…},"_doc":{…},"success":true}
 *
 * which is why approving a refund or recording a payout came back with nothing
 * the client could read. `.lean()` reads dodge this by accident; anything from
 * `.create()`, `.save()` or a plain `findById()` does not.
 *
 * Flattening the payload first restores the fields. `toJSON()` is exactly what
 * `res.json` would have called had the object not been spread out from under it,
 * so the wire format is unchanged for every caller that was already correct.
 *
 * Nested documents need no help: they survive the spread as values and
 * `JSON.stringify` calls their `toJSON()` on the way out. Only the top level,
 * the thing actually being spread, is at risk.
 */
function toPlain(data: unknown): unknown {
	if (data === null || typeof data !== 'object') return data;

	// Mongoose documents and subdocuments expose toJSON(); plain objects do not.
	if (typeof (data as { toJSON?: unknown }).toJSON === 'function') {
		return (data as { toJSON: () => unknown }).toJSON();
	}

	if (Array.isArray(data)) return data.map(toPlain);

	return data;
}

export function Respond({ res, status, data }: RespondArgs) {
	return BaseRespond({ res, status, data: toPlain(data) as RespondArgs['data'] });
}

export default Respond;
