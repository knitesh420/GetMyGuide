import express from 'express';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './tourist.controller';
import { TouristProfileValidator } from './tourist.validator';

const router = express.Router();

router
	.route('/profile')
	.get(VerifySession, VerifyMinLevel('tourist'), Controller.getTouristProfile)
	.put(
		VerifySession,
		VerifyMinLevel('tourist'),
		TouristProfileValidator,
		Controller.updateTouristProfile
	);

export default router;
