import express from 'express';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './earning.controller';
import {
	EarningListQueryValidator,
	PayoutCreateValidator,
	PayoutListQueryValidator,
} from './earning.validator';

const router = express.Router();

// ---- Guide: own ledger ----------------------------------------------------
// All registered before the admin '/' collection route so the literal paths win.
router
	.route('/my')
	.get(VerifySession, VerifyMinLevel('guide'), EarningListQueryValidator, Controller.getMy);

router.route('/my/summary').get(VerifySession, VerifyMinLevel('guide'), Controller.getMySummary);

router
	.route('/my/payouts')
	.get(VerifySession, VerifyMinLevel('guide'), PayoutListQueryValidator, Controller.getMyPayouts);

// ---- Admin: payout queue + settlement -------------------------------------
router.route('/payout-queue').get(VerifySession, VerifyMinLevel('admin'), Controller.getPayoutQueue);

router
	.route('/payouts')
	.get(VerifySession, VerifyMinLevel('admin'), PayoutListQueryValidator, Controller.getPayouts)
	// Records a transfer the admin has already made out-of-band. This endpoint
	// moves no money — it closes the ledger against the reference supplied.
	.post(VerifySession, VerifyMinLevel('admin'), PayoutCreateValidator, Controller.createPayout);

router
	.route('/')
	.get(VerifySession, VerifyMinLevel('admin'), EarningListQueryValidator, Controller.getAll);

export default router;
