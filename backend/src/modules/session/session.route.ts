import {
	OTP_RATE_LIMIT_MAX,
	OTP_RATE_LIMIT_WINDOW_SECONDS,
} from '@config/const';
import express from 'express';
import { rateLimit, VerifyMinLevel, VerifySession } from '../../middleware';
import Controller from './session.controller';
import {
	ForgotPasswordValidator,
	LoginValidator,
	OtpLoginValidator,
	ResetPasswordValidator,
	SendOtpValidator,
	SignupValidator,
} from './session.validator';

const router = express.Router();

// ---- Rate limiters --------------------------------------------------------
const loginLimiter = rateLimit({
	prefix: 'login',
	windowSeconds: 10 * 60,
	max: 10,
});

// OTP-send is keyed by email so attackers can't exhaust a victim's OTP quota
// just by rotating IPs (and vice versa).
const otpSendLimiter = rateLimit({
	prefix: 'otp-send',
	windowSeconds: OTP_RATE_LIMIT_WINDOW_SECONDS,
	max: OTP_RATE_LIMIT_MAX,
	keyFn: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`,
});

const otpVerifyLimiter = rateLimit({
	prefix: 'otp-verify',
	windowSeconds: OTP_RATE_LIMIT_WINDOW_SECONDS,
	max: OTP_RATE_LIMIT_MAX * 2,
	keyFn: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`,
});

const forgotPasswordLimiter = rateLimit({
	prefix: 'forgot-password',
	windowSeconds: 60 * 60,
	max: 5,
	keyFn: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`,
});

// ---- Public -----------------------------------------------------------------
router.route('/signup').post(SignupValidator, Controller.signup);
router.route('/login').post(loginLimiter, LoginValidator, Controller.login);
router.route('/login/send-otp').post(otpSendLimiter, SendOtpValidator, Controller.sendLoginOtp);
router
	.route('/login/verify-otp')
	.post(otpVerifyLimiter, OtpLoginValidator, Controller.loginWithOtp);
router.route('/refresh').post(Controller.refresh);
router
	.route('/forgot-password')
	.post(forgotPasswordLimiter, ForgotPasswordValidator, Controller.forgotPassword);
router.route('/reset-password').post(ResetPasswordValidator, Controller.resetPassword);

// ---- Protected --------------------------------------------------------------
router.route('/validate-auth').get(VerifySession, Controller.validateAuth);
router.route('/logout').post(VerifySession, Controller.logout);

// ---- Admin-only -------------------------------------------------------------
router
	.route('/validate-auth/admin')
	.get(VerifySession, VerifyMinLevel('admin'), Controller.validateAuth);

export default router;
