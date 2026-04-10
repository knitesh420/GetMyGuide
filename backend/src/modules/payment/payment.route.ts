import express from 'express';
import Controller from './payment.controller';
import { WebhookValidator } from './payment.validator';

const router = express.Router();

// POST /payment/webhook — Razorpay webhook receiver
// No auth required — secured by signature verification
router.route('/webhook').post(WebhookValidator, Controller.handleWebhook);

export default router;
