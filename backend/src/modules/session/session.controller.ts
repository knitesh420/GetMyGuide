import {
	ACCESS_COOKIE_MAX_AGE_MS,
	Cookie,
	IS_PRODUCTION,
	REFRESH_COOKIE_MAX_AGE_MS,
} from '@config/const';
import AuthService from '@services/auth';
import { CookieOptions, NextFunction, Request, Response } from 'express';
import { Respond, UnauthorizedError } from 'node-be-utilities';
import {
	ForgotPasswordValidationResult,
	LoginValidationResult,
	OtpLoginValidationResult,
	ResetPasswordValidationResult,
	SendOtpValidationResult,
	SignupValidationResult,
} from './session.validator';

function baseCookie(): CookieOptions {
	return {
		httpOnly: true,
		secure: IS_PRODUCTION,
		sameSite: IS_PRODUCTION ? 'none' : 'lax',
		path: '/',
	};
}


function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
	res.cookie(Cookie.Auth, accessToken, {
		...baseCookie(),
		maxAge: ACCESS_COOKIE_MAX_AGE_MS,
	});
	res.cookie(Cookie.Refresh, refreshToken, {
		...baseCookie(),
		maxAge: REFRESH_COOKIE_MAX_AGE_MS,
	});
}

function clearAuthCookies(res: Response) {
	const opts = baseCookie();
	res.clearCookie(Cookie.Auth, opts);
	res.clearCookie(Cookie.Refresh, opts);
}

async function signup(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as SignupValidationResult;
		const result = await AuthService.signup(data);
		setAuthCookies(res, result.accessToken, result.refreshToken);
		return Respond({ res, status: 201, data: { user: result.user } });
	} catch (error) {
		return next(error);
	}
}

async function login(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as LoginValidationResult;
		const result = await AuthService.login(data);
		setAuthCookies(res, result.accessToken, result.refreshToken);
		return Respond({ res, status: 200, data: { user: result.user } });
	} catch (error) {
		return next(error);
	}
}

async function refresh(req: Request, res: Response, next: NextFunction) {
	try {
		const refreshToken = req.cookies?.[Cookie.Refresh];
		if (!refreshToken) {
			throw new UnauthorizedError('Refresh token is required');
		}
		const result = await AuthService.refresh(refreshToken);
		setAuthCookies(res, result.accessToken, result.refreshToken);
		return Respond({ res, status: 200, data: { user: result.user } });
	} catch (error) {
		// Clear cookies on any refresh failure so the client stops retrying.
		clearAuthCookies(res);
		return next(error);
	}
}

async function forgotPassword(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as ForgotPasswordValidationResult;
		await AuthService.forgotPassword(data.email);
		return Respond({
			res,
			status: 200,
			data: {
				message: 'If an account with that email exists, a password reset link has been sent.',
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function resetPassword(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as ResetPasswordValidationResult;
		const result = await AuthService.resetPassword(data.token, data.password);
		setAuthCookies(res, result.accessToken, result.refreshToken);
		return Respond({ res, status: 200, data: { user: result.user } });
	} catch (error) {
		return next(error);
	}
}

async function validateAuth(req: Request, res: Response, next: NextFunction) {
	try {
		// req.locals.user is set per-request by VerifySession. It is NEVER read
		// from any shared/global state — that's what makes concurrent sessions
		// safe.
		const user = req.locals.user;
		res.setHeader('Cache-Control', 'no-store');
		return Respond({ res, status: 200, data: { user } });
	} catch (error) {
		return next(error);
	}
}

async function logout(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (user?.userId) {
			await AuthService.logout(user.userId);
		}
		clearAuthCookies(res);
		return Respond({ res, status: 200, data: { message: 'Logged out successfully' } });
	} catch (error) {
		return next(error);
	}
}

async function sendLoginOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as SendOtpValidationResult;
		await AuthService.sendLoginOtp(data.email);
		// Always respond identically regardless of whether an account exists,
		// to avoid account enumeration.
		return Respond({
			res,
			status: 200,
			data: { message: 'If this email is registered as admin, an OTP has been sent' },
		});
	} catch (error) {
		return next(error);
	}
}

async function loginWithOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as OtpLoginValidationResult;
		const result = await AuthService.loginWithOtp(data.email, data.otp);
		setAuthCookies(res, result.accessToken, result.refreshToken);
		return Respond({ res, status: 200, data: { user: result.user } });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	signup,
	login,
	refresh,
	forgotPassword,
	resetPassword,
	validateAuth,
	logout,
	sendLoginOtp,
	loginWithOtp,
};

export default Controller;
