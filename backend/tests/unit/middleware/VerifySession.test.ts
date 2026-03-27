import VerifySession, { VerifyMinLevel } from '@middleware/VerifySession';
import JWTService from '@services/jwt';
import { UnauthorizedError } from 'node-be-utilities';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
	createMockUser,
} from '../../helpers/testHelpers';

jest.mock('@services/jwt');

describe('VerifySession Middleware', () => {
	let mockRequest: any;
	let mockResponse: any;
	let mockNext: any;

	beforeEach(() => {
		mockRequest = createMockRequest();
		mockResponse = createMockResponse();
		mockNext = createMockNext();
		jest.clearAllMocks();
	});

	describe('VerifySession', () => {
		it('should verify token from Authorization header and attach user', () => {
			const mockUser = createMockUser();
			const token = 'valid-token';
			mockRequest.headers.authorization = `Bearer ${token}`;
			(JWTService.verifyToken as jest.Mock).mockReturnValue(mockUser);

			VerifySession(mockRequest, mockResponse, mockNext);

			expect(JWTService.verifyToken).toHaveBeenCalledWith(token);
			expect(mockRequest.locals.user).toEqual(mockUser);
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should verify token from cookie when Authorization header is missing', () => {
			const mockUser = createMockUser();
			const token = 'valid-token';
			mockRequest.cookies = { 'auth-cookie': token };
			(JWTService.verifyToken as jest.Mock).mockReturnValue(mockUser);

			VerifySession(mockRequest, mockResponse, mockNext);

			expect(JWTService.verifyToken).toHaveBeenCalledWith(token);
			expect(mockRequest.locals.user).toEqual(mockUser);
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should prefer Authorization header over cookie', () => {
			const mockUser = createMockUser();
			const headerToken = 'header-token';
			const cookieToken = 'cookie-token';
			mockRequest.headers.authorization = `Bearer ${headerToken}`;
			mockRequest.cookies = { 'auth-cookie': cookieToken };
			(JWTService.verifyToken as jest.Mock).mockReturnValue(mockUser);

			VerifySession(mockRequest, mockResponse, mockNext);

			expect(JWTService.verifyToken).toHaveBeenCalledWith(headerToken);
			expect(JWTService.verifyToken).not.toHaveBeenCalledWith(cookieToken);
		});

		it('should call next with UnauthorizedError when no token is provided', () => {
			VerifySession(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Authentication token is required');
			expect(mockRequest.locals.user).toBeUndefined();
		});

		it('should call next with UnauthorizedError for invalid token', () => {
			const token = 'invalid-token';
			mockRequest.headers.authorization = `Bearer ${token}`;
			(JWTService.verifyToken as jest.Mock).mockReturnValue(null);

			VerifySession(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Invalid or expired token');
		});

		it('should handle Authorization header without Bearer prefix', () => {
			const token = 'token-without-bearer';
			mockRequest.headers.authorization = token;
			(JWTService.verifyToken as jest.Mock).mockReturnValue(null);

			VerifySession(mockRequest, mockResponse, mockNext);

			// Should not extract token, so should fail with no token error
			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
		});

		it('should handle empty Authorization header', () => {
			mockRequest.headers.authorization = '';
			mockRequest.cookies = {};

			VerifySession(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
		});
	});

	describe('VerifyMinLevel', () => {
		it('should allow tourist with tourist role to access tourist-level routes', () => {
			const mockUser = createMockUser({ role: 'tourist' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('tourist');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should allow guide with guide role to access tourist-level routes', () => {
			const mockUser = createMockUser({ role: 'guide' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('tourist');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should allow admin with admin role to access tourist-level routes', () => {
			const mockUser = createMockUser({ role: 'admin' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('tourist');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should allow guide with guide role to access guide-level routes', () => {
			const mockUser = createMockUser({ role: 'guide' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('guide');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should allow admin with admin role to access guide-level routes', () => {
			const mockUser = createMockUser({ role: 'admin' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('guide');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should allow admin with admin role to access admin-level routes', () => {
			const mockUser = createMockUser({ role: 'admin' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('admin');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should reject tourist with tourist role from guide-level routes', () => {
			const mockUser = createMockUser({ role: 'tourist' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('guide');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Insufficient permissions');
		});

		it('should reject tourist with tourist role from admin-level routes', () => {
			const mockUser = createMockUser({ role: 'tourist' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('admin');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Insufficient permissions');
		});

		it('should reject guide with guide role from admin-level routes', () => {
			const mockUser = createMockUser({ role: 'guide' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('admin');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Insufficient permissions');
		});

		it('should call next with UnauthorizedError when user is not found', () => {
			mockRequest.locals.user = undefined;
			const middleware = VerifyMinLevel('tourist');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('User information not found');
		});

		it('should reject unknown roles', () => {
			const mockUser = createMockUser({ role: 'unknown' as any });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('tourist');

			middleware(mockRequest, mockResponse, mockNext);

			// Unknown role should have level 0, which is less than tourist level 1
			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
		});
	});
});
