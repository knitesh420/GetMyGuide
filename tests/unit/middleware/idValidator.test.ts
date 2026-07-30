import IDValidator from '@middleware/idValidator';
import { Types } from 'mongoose';
import { BadRequestError } from 'node-be-utilities';
import { invalidObjectId, validObjectId } from '../../helpers/fixtures';
import { createMockNext, createMockRequest, createMockResponse } from '../../helpers/testHelpers';

describe('IDValidator Middleware', () => {
	let mockRequest: any;
	let mockResponse: any;
	let mockNext: any;

	beforeEach(() => {
		mockRequest = createMockRequest();
		mockResponse = createMockResponse();
		mockNext = createMockNext();
	});

	it('should call next() with valid MongoDB ObjectId', () => {
		mockRequest.params.id = validObjectId;

		IDValidator(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith();
		expect(mockRequest.locals.id).toBeInstanceOf(Types.ObjectId);
		expect(mockRequest.locals.id.toString()).toBe(validObjectId);
	});

	it('should call next() with BadRequestError for invalid ObjectId', () => {
		mockRequest.params.id = invalidObjectId;

		IDValidator(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		const error = mockNext.mock.calls[0][0];
		expect(error.message).toBe('Invalid ID');
	});

	it('should handle empty string', () => {
		mockRequest.params.id = '';

		IDValidator(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
	});

	it('should handle non-string values', () => {
		mockRequest.params.id = 12345;

		IDValidator(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
	});

	it('should handle null', () => {
		mockRequest.params.id = null;

		IDValidator(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
	});

	it('should handle undefined', () => {
		mockRequest.params.id = undefined;

		IDValidator(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
	});

	it('should convert valid ObjectId string to Types.ObjectId', () => {
		const objectId = new Types.ObjectId();
		mockRequest.params.id = objectId.toString();

		IDValidator(mockRequest, mockResponse, mockNext);

		expect(mockRequest.locals.id).toBeInstanceOf(Types.ObjectId);
		expect(mockRequest.locals.id.toString()).toBe(objectId.toString());
	});
});
