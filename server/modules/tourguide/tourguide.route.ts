import express from 'express';
import { idempotency, VerifyMinLevel, VerifyRole, VerifySession } from '../../middleware';
import IDValidator from '../../middleware/idValidator';
import Controller from './tourguide.controller';
import {
	PaymentVerifyValidator,
	TourGuideCancelValidator,
	TourGuideCreateOrderValidator,
	TourGuideListQueryValidator,
	TourGuideQuoteValidator,
	TourGuideReassignValidator,
	TourGuideStatusValidator,
	TourGuideVerifyValidator,
} from './tourguide.validator';

const router = express.Router();

/**
 * Direct guide booking: the tourist picks a guide off their profile and pays an
 * advance against that guide's published day rate, with the balance collected
 * later. Distinct from /booking, where an admin allocates the guide afterwards.
 *
 * Every literal path is registered before the '/:id' matcher, or it would never
 * be reached.
 */

// Public — what would this cost? Lets the booking page show a price before login.
router.route('/quote').get(TourGuideQuoteValidator, Controller.getQuote);

// ---- Tourist -------------------------------------------------------------
// Exact-role gated (not min-level) so a guide, who outranks a tourist in the
// hierarchy, cannot open bookings against other guides.
router
	.route('/create-order')
	.post(
		VerifySession,
		VerifyRole('tourist', 'admin'),
		TourGuideCreateOrderValidator,
		idempotency,
		Controller.createOrder
	);

router
	.route('/verify-and-create')
	.post(VerifySession, VerifyRole('tourist', 'admin'), TourGuideVerifyValidator, Controller.verifyAndCreate);

router
	.route('/user-bookings')
	.get(VerifySession, VerifyRole('tourist', 'admin'), TourGuideListQueryValidator, Controller.getUserBookings);

// ---- Admin ---------------------------------------------------------------
router
	.route('/all')
	.get(VerifySession, VerifyMinLevel('admin'), TourGuideListQueryValidator, Controller.getAll);

// ---- Per-booking ---------------------------------------------------------
router
	.route('/:id/create-final-order')
	.post(VerifySession, IDValidator, idempotency, Controller.createFinalOrder);

router
	.route('/:id/verify-final-payment')
	.post(VerifySession, IDValidator, PaymentVerifyValidator, Controller.verifyFinalPayment);

// Opens a cancellation request for an admin to decide on — it does not cancel.
router
	.route('/:id/cancel')
	.post(VerifySession, IDValidator, TourGuideCancelValidator, Controller.cancel);

router
	.route('/:id/status')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, TourGuideStatusValidator, Controller.updateStatus);

router
	.route('/:id/reassign-guide')
	.patch(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		TourGuideReassignValidator,
		Controller.reassignGuide
	);

router.route('/:id').get(VerifySession, IDValidator, Controller.getById);

export default router;
export { Controller as TourGuideController };
