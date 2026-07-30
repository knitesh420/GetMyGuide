import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './review.controller';
import {
	ReviewCreateValidator,
	ReviewHideValidator,
	ReviewListQueryValidator,
	ReviewMyQueryValidator,
} from './review.validator';

const router = express.Router();

router.route('/guide/:guideId').get(Controller.getPublicGuideReviews);

router.route('/my').get(VerifySession, VerifyMinLevel('tourist'), ReviewMyQueryValidator, Controller.getMyReviews);

router
	.route('/mine/guide')
	.get(VerifySession, VerifyMinLevel('guide'), ReviewMyQueryValidator, Controller.getMineAsGuide);

router
	.route('/')
	.post(VerifySession, VerifyMinLevel('tourist'), ReviewCreateValidator, Controller.createReview)
	.get(VerifySession, VerifyMinLevel('admin'), ReviewListQueryValidator, Controller.getAllForAdmin);

router
	.route('/:id/hide')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, ReviewHideValidator, Controller.setHidden);

router.route('/:id').delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.deleteReview);

export default router;
