import { AccountDB } from '@mongo';
import VerifySession, { VerifyMinLevel } from '@middleware/VerifySession';
import JWTService from '@services/jwt';
import { ForbiddenError, UnauthorizedError } from 'node-be-utilities';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
	createMockUser,
} from '../../helpers/testHelpers';

jest.mock('@services/jwt');
jest.mock('@mongo', () => ({ AccountDB: { findById: jest.fn() } }));

/**
 * VerifySession resolves the caller in two steps: verify the token, then look
 * the account up to compare tokenVersion (which is what makes logout and
 * password-reset revoke previously issued tokens). Both have to be stubbed, and
 * the middleware awaited — it is async.
 */
function stubAccount(user: { tokenVersion?: number; isActive?: boolean } = {}) {
	(AccountDB.findById as jest.Mock).mockReturnValue({
		select: jest.fn().mockResolvedValue({
			tokenVersion: user.tokenVersion ?? 0,
			isActive: user.isActive ?? true,
			role: 'tourist',
		}),
	});
}

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
		it('should verify token from Authorization header and attach user', async () => {
			const mockUser = createMockUser();
			const token = 'valid-token';
			mockRequest.headers.authorization = `Bearer ${token}`;
			(JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUser);
			stubAccount({ tokenVersion: mockUser.tokenVersion });

			await VerifySession(mockRequest, mockResponse, mockNext);

			expect(JWTService.verifyAccessToken).toHaveBeenCalledWith(token);
			expect(mockRequest.locals.user).toEqual(mockUser);
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should verify token from cookie when Authorization header is missing', async () => {
			const mockUser = createMockUser();
			const token = 'valid-token';
			mockRequest.cookies = { 'auth-cookie': token };
			(JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUser);
			stubAccount({ tokenVersion: mockUser.tokenVersion });

			await VerifySession(mockRequest, mockResponse, mockNext);

			expect(JWTService.verifyAccessToken).toHaveBeenCalledWith(token);
			expect(mockRequest.locals.user).toEqual(mockUser);
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should prefer the cookie over the Authorization header', async () => {
			// The cookie is the primary transport; the header exists as a fallback
			// for non-browser clients. This assertion used to be the other way
			// round, from before that decision was made.
			const mockUser = createMockUser();
			const headerToken = 'header-token';
			const cookieToken = 'cookie-token';
			mockRequest.headers.authorization = `Bearer ${headerToken}`;
			mockRequest.cookies = { 'auth-cookie': cookieToken };
			(JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUser);
			stubAccount({ tokenVersion: mockUser.tokenVersion });

			await VerifySession(mockRequest, mockResponse, mockNext);

			expect(JWTService.verifyAccessToken).toHaveBeenCalledWith(cookieToken);
			expect(JWTService.verifyAccessToken).not.toHaveBeenCalledWith(headerToken);
		});

		it('should call next with UnauthorizedError when no token is provided', async () => {
			await VerifySession(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Authentication token is required');
			expect(mockRequest.locals.user).toBeUndefined();
		});

		it('should call next with UnauthorizedError for invalid token', async () => {
			const token = 'invalid-token';
			mockRequest.headers.authorization = `Bearer ${token}`;
			(JWTService.verifyAccessToken as jest.Mock).mockReturnValue(null);

			await VerifySession(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Invalid or expired token');
		});

		it('should handle Authorization header without Bearer prefix', async () => {
			const token = 'token-without-bearer';
			mockRequest.headers.authorization = token;
			(JWTService.verifyAccessToken as jest.Mock).mockReturnValue(null);

			await VerifySession(mockRequest, mockResponse, mockNext);

			// Should not extract token, so should fail with no token error
			expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
		});

		it('should handle empty Authorization header', async () => {
			mockRequest.headers.authorization = '';
			mockRequest.cookies = {};

			await VerifySession(mockRequest, mockResponse, mockNext);

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

			expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Insufficient permissions');
		});

		it('should reject tourist with tourist role from admin-level routes', () => {
			const mockUser = createMockUser({ role: 'tourist' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('admin');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
			const error = mockNext.mock.calls[0][0];
			expect(error.message).toBe('Insufficient permissions');
		});

		it('should reject guide with guide role from admin-level routes', () => {
			const mockUser = createMockUser({ role: 'guide' });
			mockRequest.locals.user = mockUser;
			const middleware = VerifyMinLevel('admin');

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
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
			expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
		});
	});
});
