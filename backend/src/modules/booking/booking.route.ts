import express from 'express';
import { idempotency, VerifyMinLevel, VerifySession } from '../../middleware';
import IDValidator from '../../middleware/idValidator';
import Controller from './booking.controller';
import { AllocateGuideValidator, CreateBookingValidator } from './booking.validator';

const router = express.Router();

// Public routes
router.route('/key').get(Controller.getRazorpayKey);
router
	.route('/guest-booking')
	.post(CreateBookingValidator, idempotency, Controller.createGuestBooking);
router.route('/verify-guest-booking').post(Controller.verifyAndCreateGuestBooking);

// Tourist routes
router
	.route('/customised-booking')
	.post(
		VerifySession,
		VerifyMinLevel('tourist'),
		CreateBookingValidator,
		idempotency,
		Controller.createCustomisedBooking
	);

router
	.route('/verify-booking')
	.post(VerifySession, VerifyMinLevel('tourist'), Controller.verifyAndCreateBooking);

router
	.route('/my-bookings')
	.get(VerifySession, VerifyMinLevel('tourist'), Controller.getMyBookings);

// Admin routes
router.route('/').get(VerifySession, VerifyMinLevel('admin'), Controller.getAllBookings);

router
	.route('/:id/allocate-guide')
	.post(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		AllocateGuideValidator,
		Controller.allocateGuide
	);

router
	.route('/:id')
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.deleteBooking);

// Guide routes
router
	.route('/my-reservations')
	.get(VerifySession, VerifyMinLevel('guide'), Controller.getMyReservations);

// Tourist detail route
router.route('/:id').get(VerifySession, IDValidator, Controller.getBookingById);

// Private route (authenticated users)
router
	.route('/:id/transaction-status')
	.get(VerifySession, IDValidator, Controller.getTransactionStatus);

export default router;
