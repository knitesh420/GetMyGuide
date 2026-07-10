import express from 'express';
import VerifySession, { VerifyRole } from '../../middleware/VerifySession';
import Controller from './tourist.controller';
import { TouristProfileValidator } from './tourist.validator';

const router = express.Router();

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
