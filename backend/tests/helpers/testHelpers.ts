import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '@services/jwt';

export function createMockRequest(overrides?: Partial<Request>): Partial<Request> {
	return {
		body: {},
		params: {},
		query: {},
		headers: {},
		cookies: {},
		locals: {},
		...overrides,
	} as Partial<Request>;
}

export function createMockResponse(): Partial<Response> {
	const res: Partial<Response> = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		setHeader: jest.fn().mockReturnThis(),
		set: jest.fn().mockReturnThis(),
		sendFile: jest.fn().mockReturnThis(),
		statusCode: 200,
	};
	return res;
}

export function createMockNext(): NextFunction {
	return jest.fn() as NextFunction;
}

export function createMockUser(payload?: Partial<JWTPayload>): JWTPayload {
	return {
		userId: '507f1f77bcf86cd799439011',
		role: 'tourist',
		email: 'test@example.com',
		name: 'Test User',
		...payload,
	};
}

export function createMockFile(overrides?: Partial<Express.Multer.File>): Express.Multer.File {
	return {
		fieldname: 'file',
		originalname: 'test.jpg',
		encoding: '7bit',
		mimetype: 'image/jpeg',
		size: 1024,
		buffer: Buffer.from('test file content'),
		destination: '/tmp',
		filename: 'test-file.jpg',
		path: '/tmp/test-file.jpg',
		stream: null as any,
		...overrides,
	} as Express.Multer.File;
}
