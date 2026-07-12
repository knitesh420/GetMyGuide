import mongoose from 'mongoose';
import { Response } from 'express';
import { Respond } from '@utils/respond';

/**
 * The library's Respond() answers with `res.json({ ...data, success })`. Spreading
 * a Mongoose document copies its internals (`$__`, `_doc`) and none of its fields,
 * so every controller that handed one over was serialising nothing the client
 * could read. These tests pin that down at the exact point it broke.
 */

const TestSchema = new mongoose.Schema({ status: String, amount: Number });
const TestModel = mongoose.model('RespondProbe', TestSchema);

/** Minimal Express double: capture whatever body res.json() is handed. */
function fakeRes() {
	const captured: { body?: Record<string, unknown>; status?: number } = {};
	const res = {
		setHeader: () => undefined,
		status(code: number) {
			captured.status = code;
			return this;
		},
		json(body: Record<string, unknown>) {
			captured.body = body;
			return this;
		},
	};
	return { res: res as unknown as Response, captured };
}

describe('Respond', () => {
	it('spreading a raw Mongoose document loses every field (the bug being fixed)', () => {
		const doc = new TestModel({ status: 'processed', amount: 500 });

		// This is precisely what the unwrapped library helper did.
		const naive = { ...doc, success: true } as Record<string, unknown>;

		expect(Object.keys(naive)).toEqual(expect.arrayContaining(['$__', '_doc']));
		expect(naive.status).toBeUndefined();
		expect(naive.amount).toBeUndefined();
	});

	it('flattens a Mongoose document so its fields survive the spread', () => {
		const doc = new TestModel({ status: 'processed', amount: 500 });
		const { res, captured } = fakeRes();

		Respond({ res, status: 200, data: doc });

		expect(captured.status).toBe(200);
		expect(captured.body).toMatchObject({ status: 'processed', amount: 500, success: true });
		expect(Object.keys(captured.body!)).not.toContain('$__');
		expect(Object.keys(captured.body!)).not.toContain('_doc');
	});

	it('flattens documents nested in an array', () => {
		const docs = [
			new TestModel({ status: 'paid', amount: 10 }),
			new TestModel({ status: 'pending', amount: 20 }),
		];
		const { res, captured } = fakeRes();

		Respond({ res, status: 200, data: docs });

		// An array still spreads to numeric keys — that contract is unchanged, and
		// the client rebuilds it. What matters is that each entry is a real object.
		expect(captured.body!['0']).toMatchObject({ status: 'paid', amount: 10 });
		expect(captured.body!['1']).toMatchObject({ status: 'pending', amount: 20 });
	});

	it('leaves a paginated envelope untouched', () => {
		const { res, captured } = fakeRes();
		const page = { data: [{ _id: 'a' }], total: 1, page: 1, totalPages: 1 };

		Respond({ res, status: 200, data: page });

		expect(captured.body).toEqual({ ...page, success: true });
	});

	it('still reports failure statuses as success: false', () => {
		const { res, captured } = fakeRes();

		Respond({ res, status: 404, data: { message: 'Not found' } });

		expect(captured.status).toBe(404);
		expect(captured.body).toMatchObject({ message: 'Not found', success: false });
	});
});
