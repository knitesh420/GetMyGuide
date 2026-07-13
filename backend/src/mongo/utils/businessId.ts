/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientSession } from 'mongoose';
import CounterDB from '../repo/Counter';

// Human-facing business-ID prefixes. Padded to 6 digits => "BK000001".
// Backed by the same atomic Counter collection the invoice service already uses.
const PREFIX = {
	tourist: 'TO',
	guide: 'GU',
	booking: 'BK',
	trip: 'TR',
	assignment: 'AS',
	payment: 'PM',
	refund: 'RF',
	earning: 'EA',
	payout: 'PO',
	cash_payment: 'CP',
} as const;

export type CodeEntity = keyof typeof PREFIX;

/**
 * Atomically allocate the next business code for an entity, e.g. 'BK000042'.
 * Gaps are acceptable (a rolled-back insert simply burns a number); codes are
 * never reused. Pass a session to enrol the counter write in a transaction.
 */
export async function nextCode(entity: CodeEntity, session?: ClientSession): Promise<string> {
	const counter = await CounterDB.findOneAndUpdate(
		{ _id: entity },
		{ $inc: { seq: 1 } },
		{ upsert: true, new: true, ...(session ? { session } : {}) }
	);
	return PREFIX[entity] + counter.seq.toString().padStart(6, '0');
}

/**
 * For collections created via `findOneAndUpdate({ upsert: true })` (which does
 * not fire document `save`/`validate` hooks), attach the business code through
 * `$setOnInsert` — but only when the document does not yet exist, so ordinary
 * updates never burn a counter value. Typed loosely because it operates on a
 * live Mongoose query whose generics vary per model.
 */
export async function attachCodeOnUpsert(
	query: any,
	entity: CodeEntity,
	field: string
): Promise<void> {
	if (!query.getOptions().upsert) {
		return;
	}
	const exists = await query.model.exists(query.getFilter());
	if (exists) {
		return;
	}
	const update = query.getUpdate() || {};
	update.$setOnInsert = { ...(update.$setOnInsert || {}), [field]: await nextCode(entity) };
	query.setUpdate(update);
}
