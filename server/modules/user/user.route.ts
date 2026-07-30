import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './user.controller';

const router = express.Router();

// The calling account — the "who am I" endpoint, open to any signed-in role.
// Registered first so 'me' is never parsed as an :id.
router.route('/me').get(VerifySession, Controller.getMe);

// Admin protected routes
router.route('/tourists').get(VerifySession, VerifyMinLevel('admin'), Controller.getAllTourists);

// Every account, optionally narrowed by ?role= and ?search= / ?query=.
router.route('/').get(VerifySession, VerifyMinLevel('admin'), Controller.getAllAccounts);

// Accounts of a single role, e.g. /users/role/guide.
router
	.route('/role/:role')
	.get(VerifySession, VerifyMinLevel('admin'), Controller.getAccountsByRole);

router
	.route('/:id')
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.deleteTourist);

// Reactivate a previously deactivated tourist account.
router
	.route('/:id/activate')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.activateTourist);

export default router;
