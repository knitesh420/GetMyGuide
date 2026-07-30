import { GuideProfileValidator } from '../../../../server/modules/guide/guide.validator';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
} from '../../../helpers/testHelpers';

const validBody = {
	phone: '9876543210',
	type: 'normal',
	city: 'Mumbai',
	languages: JSON.stringify(['English', 'Hindi']),
};

const run = async (body: Record<string, unknown>) => {
	const req = createMockRequest({ body }) as any;
	const next = createMockNext() as jest.Mock;
	await GuideProfileValidator(req, createMockResponse() as any, next);
	return { req, next };
};

describe('Guide Validators', () => {
	describe('GuideProfileValidator', () => {
		it('should pass validation with valid data', async () => {
			const { req, next } = await run(validBody);

			expect(next).toHaveBeenCalledWith();
			expect(req.locals.data.city).toBe('Mumbai');
			expect(req.locals.data.type).toBe('normal');
			expect(req.locals.data.languages).toEqual(['English', 'Hindi']);
		});

		it('should accept languages as a comma-separated string', async () => {
			const { req, next } = await run({ ...validBody, languages: 'English, Hindi' });

			expect(next).toHaveBeenCalledWith();
			expect(req.locals.data.languages).toEqual(['English', 'Hindi']);
		});

		it('should reject a phone number that is not exactly 10 digits', async () => {
			const { next } = await run({ ...validBody, phone: '12345' });

			expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
			expect(next.mock.calls[0][0].message).toMatch(/10 digits/i);
		});

		it('should reject an unknown guide type', async () => {
			const { next } = await run({ ...validBody, type: 'freelance' });

			expect(next.mock.calls[0][0].message).toMatch(/type/i);
		});

		it('should require at least one language', async () => {
			const { next } = await run({ ...validBody, languages: JSON.stringify([]) });

			expect(next.mock.calls[0][0].message).toMatch(/language/i);
		});

		// PAN is what distinguishes an escort guide for tax purposes, so it is
		// conditionally required rather than always optional.
		it('should require a PAN when the guide type is escort', async () => {
			const { next } = await run({ ...validBody, type: 'escort' });

			expect(next.mock.calls[0][0].message).toMatch(/pan/i);
		});

		it('should accept an escort guide that supplies a PAN', async () => {
			const { req, next } = await run({ ...validBody, type: 'escort', pan: 'ABCDE1234F' });

			expect(next).toHaveBeenCalledWith();
			expect(req.locals.data.pan).toBe('ABCDE1234F');
		});

		it('should not require a PAN from a normal guide', async () => {
			const { req, next } = await run(validBody);

			expect(next).toHaveBeenCalledWith();
			expect(req.locals.data.pan).toBeUndefined();
		});
	});
});
