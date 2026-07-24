import express from 'express';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './payment.controller';
import { FailedPaymentQueryValidator, WebhookValidator } from './payment.validator';

const router = express.Router();

// POST /payment/webhook — Razorpay webhook receiver
// No auth required — secured by signature verification
router.route('/webhook').post(WebhookValidator, Controller.handleWebhook);

// GET /payment/admin/failed — payments that never landed, platform-wide
router
	.route('/admin/failed')
	.get(VerifySession, VerifyMinLevel('admin'), FailedPaymentQueryValidator, Controller.listFailed);

// GET /payment/my-failed — the caller's own unsuccessful payments
router.route('/my-failed').get(VerifySession, Controller.listMyFailed);

export default router;
