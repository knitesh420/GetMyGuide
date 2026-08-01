import { Types } from 'mongoose';

import { refEquals, refId } from '@utils/refId';

/**
 * These exist because of a bug that produced no error and no failing test: an
 * authorisation guard compared a POPULATED reference with `.toString()`, which
 * yields '[object Object]', so the check silently never matched and the
 * allocated guide was refused their own booking.
 *
 * The populated-document cases below are the ones that matter — a helper that
 * only handles raw ObjectIds is exactly what was already there.
 */
describe('refId / refEquals', () => {
	const id = new Types.ObjectId();
	const idString = id.toString();

	describe('refId', () => {
		it('reads a raw ObjectId', () => {
			expect(refId(id)).toBe(idString);
		});

		it('reads a string id unchanged', () => {
			expect(refId(idString)).toBe(idString);
		});

		it('reads a POPULATED document — the case that caused the bug', () => {
			// What `.populate('allocated_guide', 'name email phone')` leaves behind.
			const populated = { _id: id, name: 'Test guide', email: 'g@example.com' };

			expect(refId(populated)).toBe(idString);
			// The plain comparison the fix replaced:
			expect(populated.toString()).toBe('[object Object]');
		});

		it('reads a populated document whose _id is already a string, as .lean() can give', () => {
			expect(refId({ _id: idString, name: 'Test guide' })).toBe(idString);
		});

		it('is undefined for a missing ref rather than a falsy string', () => {
			expect(refId(undefined)).toBeUndefined();
			expect(refId(null)).toBeUndefined();
		});
	});

	describe('refEquals', () => {
		it('matches a populated ref against a user id', () => {
			expect(refEquals({ _id: id, name: 'Test guide' }, idString)).toBe(true);
		});

		it('matches a raw ref against a user id', () => {
			expect(refEquals(id, idString)).toBe(true);
		});

		it('does not match a different id', () => {
			expect(refEquals(id, new Types.ObjectId().toString())).toBe(false);
		});

		it('an absent ref never matches — including against an absent user id', () => {
			// Both undefined must be false, not true. A guard that reads "is this
			// booking mine?" would otherwise admit everyone on an unallocated
			// booking, which is the inverse of the bug this file is about.
			expect(refEquals(undefined, idString)).toBe(false);
			expect(refEquals(undefined, undefined)).toBe(false);
			expect(refEquals(null, undefined)).toBe(false);
		});
	});
});
