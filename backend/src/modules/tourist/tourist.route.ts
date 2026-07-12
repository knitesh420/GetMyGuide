import express from 'express';
import VerifySession, { VerifyMinLevel, VerifyRole } from '../../middleware/VerifySession';
import Controller from './tourist.controller';
import { TouristProfileValidator } from './tourist.validator';

const router = express.Router();

// Admin only - list every tourist with profile + business code for the admin
// management table.
router.route('/admin/all').get(VerifySession, VerifyMinLevel('admin'), Controller.getAllTouristsForAdmin);

// Single-request payload for the tourist Dashboard Home. Read-only aggregate of
// data the detail pages already expose — it adds no new capability, so it is
// gated exactly like /profile.
router
	.route('/dashboard')
	.get(VerifySession, VerifyRole('tourist', 'admin'), Controller.getTouristDashboard);

router
	.route('/profile')
	.get(VerifySession, VerifyRole('tourist', 'admin'), Controller.getTouristProfile)
	.put(
		VerifySession,
		VerifyRole('tourist', 'admin'),
		TouristProfileValidator,
		Controller.updateTouristProfile
	);

export default router;
