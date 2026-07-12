import express from 'express';
import { idempotency, VerifyMinLevel, VerifyRole, VerifySession } from '../../middleware';
import IDValidator from '../../middleware/idValidator';
import { PaymentVerifyValidator } from '../tourguide/tourguide.validator';
import Controller from './booking.controller';
import {
	AllocateGuideValidator,
	CreateBookingValidator,
	PackageBookingValidator,
} from './booking.validator';

const router = express.Router();

// Public routes
router.route('/key').get(Controller.getRazorpayKey);
router
	.route('/guest-booking')
	.post(CreateBookingValidator, idempotency, Controller.createGuestBooking);
router.route('/verify-guest-booking').post(Controller.verifyAndCreateGuestBooking);

// Tourist routes — exact-role gated so guides (who outrank tourists in the
// hierarchy) cannot create or read tourist bookings. Admins retain access.
router
	.route('/customised-booking')
	.post(
		VerifySession,
		VerifyRole('tourist', 'admin'),
		CreateBookingValidator,
		idempotency,
		Controller.createCustomisedBooking
	);

router
	.route('/verify-booking')
	.post(VerifySession, VerifyRole('tourist', 'admin'), Controller.verifyAndCreateBooking);

router
	.route('/my-bookings')
	.get(VerifySession, VerifyRole('tourist', 'admin'), Controller.getMyBookings);

// Package-tour booking (authenticated tourist, 20% advance). Registered before
// the '/:id' routes so these literal paths win over the id matcher.
router
	.route('/package/create-order')
	.post(
		VerifySession,
		VerifyRole('tourist', 'admin'),
		PackageBookingValidator,
		idempotency,
		Controller.createPackageBooking
	);

router
	.route('/package/verify')
	.post(VerifySession, VerifyRole('tourist', 'admin'), Controller.verifyPackageBooking);

// Collect the outstanding balance on any booking confirmed with an advance —
// package tours and direct guide bookings alike. Registered before '/:id'.
router
	.route('/:id/balance/create-order')
	.post(VerifySession, IDValidator, idempotency, Controller.createBalanceOrder);

router
	.route('/:id/balance/verify')
	.post(VerifySession, IDValidator, PaymentVerifyValidator, Controller.verifyBalancePayment);

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
