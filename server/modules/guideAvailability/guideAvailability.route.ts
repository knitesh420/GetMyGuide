import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './guideAvailability.controller';
import { CreateLeaveValidator, GuidesAvailabilityQueryValidator } from './guideAvailability.validator';

const router = express.Router();

// Guide: manage own vacation/emergency leave
router
	.route('/leave')
	.post(VerifySession, VerifyMinLevel('guide'), CreateLeaveValidator, Controller.createLeave);
router.route('/leave/my').get(VerifySession, VerifyMinLevel('guide'), Controller.getMyLeaves);
router.route('/leave/:id').delete(VerifySession, VerifyMinLevel('guide'), IDValidator, Controller.cancelLeave);

// Guide: own merged calendar (unavailable dates + leaves + booked ranges)
router.route('/calendar/me').get(VerifySession, VerifyMinLevel('guide'), Controller.getMyCalendar);

// Admin: guides annotated with availability for a date range — must be
// registered before '/calendar/:id' below, otherwise it would never match.
router
	.route('/guides')
	.get(VerifySession, VerifyMinLevel('admin'), GuidesAvailabilityQueryValidator, Controller.getGuidesAvailability);

// Admin: merged calendar for any guide
router.route('/calendar/:id').get(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.getGuideCalendar);

export default router;
