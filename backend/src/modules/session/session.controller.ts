import AuthService from '@services/auth';
import { NextFunction, Request, Response } from 'express';
import { Respond } from 'node-be-utilities';
import {
	ForgotPasswordValidationResult,
	LoginValidationResult,
	ResetPasswordValidationResult,
	SignupValidationResult,
} from './session.validator';

async function signup(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as SignupValidationResult;
		const result = await AuthService.signup(data);
		return Respond({
			res,
			status: 201,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function login(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as LoginValidationResult;
		const result = await AuthService.login(data);
		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
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
		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function validateAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		return Respond({
			res,
			status: 200,
			data: {
				user,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function logout(req: Request, res: Response, _next: NextFunction) {
	// Logout is handled client-side by removing the token
	// This endpoint just confirms the logout
	return Respond({
		res,
		status: 200,
		data: {
			message: 'Logged out successfully',
		},
	});
}

const Controller = {
	signup,
	login,
	forgotPassword,
	resetPassword,
	validateAuth,
	logout,
};

export default Controller;
