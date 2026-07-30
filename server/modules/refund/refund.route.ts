import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './refund.controller';
import {
	RefundApproveValidator,
	RefundListQueryValidator,
	RefundRejectValidator,
	RefundRequestValidator,
} from './refund.validator';

const router = express.Router();

// Anyone attached to a booking (its tourist, its guide) can ask to cancel it —
// the service does the ownership check. Nothing is cancelled until an admin acts.
router.route('/request').post(VerifySession, RefundRequestValidator, Controller.requestCancellation);

// A requester's own history. Registered before '/:id' so it isn't swallowed by it.
router.route('/my').get(VerifySession, RefundListQueryValidator, Controller.getMy);

// Admin queue.
router
	.route('/')
	.get(VerifySession, VerifyMinLevel('admin'), RefundListQueryValidator, Controller.getAll);

router
	.route('/:id/approve')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, RefundApproveValidator, Controller.approve);

router
	.route('/:id/reject')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, RefundRejectValidator, Controller.reject);

// Re-attempt only the Razorpay legs that failed on a previously approved refund.
router
	.route('/:id/retry')
	.post(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.retry);

router.route('/:id').get(VerifySession, IDValidator, Controller.getById);

export default router;
