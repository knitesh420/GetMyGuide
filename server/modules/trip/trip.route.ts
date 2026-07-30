import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './trip.controller';
import {
	TripCancelValidator,
	TripCompleteValidator,
	TripListQueryValidator,
	TripMyQueryValidator,
	TripStartValidator,
} from './trip.validator';

const router = express.Router();

router.route('/my').get(VerifySession, VerifyMinLevel('guide'), TripMyQueryValidator, Controller.getMy);

router.route('/mine').get(VerifySession, VerifyMinLevel('tourist'), TripMyQueryValidator, Controller.getMine);

router.route('/').get(VerifySession, VerifyMinLevel('admin'), TripListQueryValidator, Controller.getAll);

router
	.route('/:id/start')
	.patch(VerifySession, VerifyMinLevel('guide'), IDValidator, TripStartValidator, Controller.start);

router
	.route('/:id/complete')
	.patch(VerifySession, VerifyMinLevel('guide'), IDValidator, TripCompleteValidator, Controller.complete);

router
	.route('/:id/cancel')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, TripCancelValidator, Controller.cancel);

router.route('/:id').get(VerifySession, VerifyMinLevel('tourist'), IDValidator, Controller.getById);

export default router;
