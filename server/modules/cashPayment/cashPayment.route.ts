import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './cashPayment.controller';
import {
	CashPaymentCreateValidator,
	CashPaymentListQueryValidator,
	CashPaymentUpdateValidator,
	CashPaymentVoidValidator,
} from './cashPayment.validator';

const router = express.Router();

// Manually recorded cash payments. These live alongside — never on top of — the
// online Razorpay payments in `transactions`: a guide's full payment history is
// the union of the two, and neither collection can overwrite the other.
//
// Only admins may create, edit or void a record. A guide may read their own.

// ---- Guide: own payment history -------------------------------------------
// Before '/:id' so 'my' is not read as an id.
router
	.route('/my')
	.get(VerifySession, VerifyMinLevel('guide'), CashPaymentListQueryValidator, Controller.getMy);

// ---- Admin: one guide's records -------------------------------------------
router
	.route('/guide/:id')
	.get(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		CashPaymentListQueryValidator,
		Controller.getForGuide
	);

// ---- Admin: collection + single record ------------------------------------
router
	.route('/')
	.get(VerifySession, VerifyMinLevel('admin'), CashPaymentListQueryValidator, Controller.getAll)
	.post(VerifySession, VerifyMinLevel('admin'), CashPaymentCreateValidator, Controller.create);

router
	.route('/:id')
	.patch(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		CashPaymentUpdateValidator,
		Controller.update
	)
	// Soft delete — the record is voided, not removed. See CashPaymentService.void.
	.delete(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		CashPaymentVoidValidator,
		Controller.remove
	);

export default router;
