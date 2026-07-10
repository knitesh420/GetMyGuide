import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './user.controller';

const router = express.Router();

// Admin protected routes
router.route('/tourists').get(VerifySession, VerifyMinLevel('admin'), Controller.getAllTourists);

router
	.route('/:id')
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.deleteTourist);

// Reactivate a previously deactivated tourist account.
router
	.route('/:id/activate')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.activateTourist);

export default router;
