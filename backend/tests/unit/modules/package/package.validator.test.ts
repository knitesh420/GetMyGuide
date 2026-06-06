import { BadRequestError } from 'node-be-utilities';
import {
	CreatePackageValidator,
	UpdatePackageValidator,
	UpdateStatusValidator,
} from '../../../../src/modules/package/package.validator';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
} from '../../../helpers/testHelpers';

const validTranslation = (overrides: Record<string, unknown> = {}) => ({
	title: 'Golden Triangle Tour',
	city: 'Delhi',
	places: ['India Gate', 'Red Fort'],
	shortDescription: 'A compact city tour',
	description: 'Detailed package description',
	inclusions: ['Guide', 'Breakfast'],
	exclusions: ['Flights'],
	highlights: ['Old Delhi walk'],
	...overrides,
});

const validCreateBody = (overrides: Record<string, unknown> = {}) => ({
	price: '5000',
	numberOfPeople: '2',
	numberOfDays: '3',
	featured: 'true',
	translations: {
		en: validTranslation(),
	},
	...overrides,
});

describe('Package Validator', () => {
	let mockRequest: any;
	let mockResponse: any;
	let mockNext: ReturnType<typeof createMockNext>;

	const nextError = () => (mockNext as jest.Mock).mock.calls[0][0];

	beforeEach(() => {
		mockRequest = createMockRequest();
		mockResponse = createMockResponse();
		mockNext = createMockNext();
	});

	describe('CreatePackageValidator', () => {
		it('passes validation with valid package data', async () => {
			mockRequest.body = validCreateBody();

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data).toEqual({
				price: 5000,
				numberOfPeople: 2,
				numberOfDays: 3,
				featured: true,
				translations: {
					en: validTranslation(),
				},
			});
		});

		it('parses translations from multipart form-data JSON strings', async () => {
			mockRequest.body = validCreateBody({
				translations: JSON.stringify({
					en: validTranslation({
						places: 'Qutub Minar, Lotus Temple',
						inclusions: 'Guide, Breakfast',
						exclusions: 'Flights',
						highlights: 'Sunset view, Heritage walk',
					}),
				}),
			});

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data.translations.en.places).toEqual([
				'Qutub Minar',
				'Lotus Temple',
			]);
			expect(mockRequest.locals.data.translations.en.highlights).toEqual([
				'Sunset view',
				'Heritage walk',
			]);
		});

		it('rejects invalid translations JSON', async () => {
			mockRequest.body = validCreateBody({ translations: '{bad json' });

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(nextError()).toBeInstanceOf(BadRequestError);
			expect(nextError().message).toContain('Invalid translations JSON');
		});

		it('requires numberOfPeople', async () => {
			mockRequest.body = validCreateBody({ numberOfPeople: undefined });

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(nextError()).toBeInstanceOf(BadRequestError);
			expect(nextError().message).toContain('numberOfPeople');
		});

		it('requires English highlights', async () => {
			mockRequest.body = validCreateBody({
				translations: {
					en: validTranslation({ highlights: [] }),
				},
			});

			await CreatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(nextError()).toBeInstanceOf(BadRequestError);
			expect(nextError().message).toContain('translations.en.highlights');
		});
	});

	describe('UpdatePackageValidator', () => {
		it('passes validation with partial scalar updates', async () => {
			mockRequest.body = {
				price: '6000',
				numberOfDays: '4',
				featured: 'false',
			};

			await UpdatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data).toEqual({
				price: 6000,
				numberOfDays: 4,
				featured: false,
			});
		});

		it('parses translation update JSON strings into dot-notation updates', async () => {
			const en = validTranslation({ title: 'Updated Tour' });
			mockRequest.body = {
				translations: JSON.stringify({ en }),
			};

			await UpdatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data).toEqual({
				'translations.en': en,
			});
		});

		it('passes validation with an empty update body', async () => {
			mockRequest.body = {};

			await UpdatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data).toEqual({});
		});

		it('rejects negative prices', async () => {
			mockRequest.body = { price: '-1' };

			await UpdatePackageValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(nextError()).toBeInstanceOf(BadRequestError);
			expect(nextError().message).toContain('price');
		});
	});

	describe('UpdateStatusValidator', () => {
		it('passes validation with active status', async () => {
			mockRequest.body = { status: 'active' };

			await UpdateStatusValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals.data.status).toBe('active');
		});

		it('rejects invalid status values', async () => {
			mockRequest.body = { status: 'archived' };

			await UpdateStatusValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(nextError()).toBeInstanceOf(BadRequestError);
			expect(nextError().message).toContain('status');
		});
	});
});
