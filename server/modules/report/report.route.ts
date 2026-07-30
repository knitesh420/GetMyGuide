import express from 'express';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './report.controller';
import { ActivityLogQueryValidator, BookingsTrendValidator, GuidePerformanceValidator } from './report.validator';

const router = express.Router();

router.route('/overview').get(VerifySession, VerifyMinLevel('admin'), Controller.getOverview);

router
	.route('/bookings-trend')
	.get(VerifySession, VerifyMinLevel('admin'), BookingsTrendValidator, Controller.getBookingsTrend);

router
	.route('/guide-performance')
	.get(VerifySession, VerifyMinLevel('admin'), GuidePerformanceValidator, Controller.getGuidePerformance);

router
	.route('/activity-log')
	.get(VerifySession, VerifyMinLevel('admin'), ActivityLogQueryValidator, Controller.getActivityLog);

export default router;
