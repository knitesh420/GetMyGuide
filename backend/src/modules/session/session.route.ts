import express from 'express';
import { VerifyMinLevel, VerifySession } from '../../middleware';
import Controller from './session.controller';
import {
	ForgotPasswordValidator,
	LoginValidator,
	ResetPasswordValidator,
	SignupValidator,
} from './session.validator';

const router = express.Router();

// Public routes
router.route('/signup').post(SignupValidator, Controller.signup);
router.route('/login').post(LoginValidator, Controller.login);
router.route('/forgot-password').post(ForgotPasswordValidator, Controller.forgotPassword);
router.route('/reset-password').post(ResetPasswordValidator, Controller.resetPassword);

// Protected routes
router.route('/validate-auth').get(VerifySession, Controller.validateAuth);
router.route('/logout').post(VerifySession, Controller.logout);

// Admin-only route
router
	.route('/validate-auth/admin')
	.get(VerifySession, VerifyMinLevel('admin'), Controller.validateAuth);

export default router;
