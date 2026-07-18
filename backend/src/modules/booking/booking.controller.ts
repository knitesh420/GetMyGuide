import BalancePaymentService from '@services/balancePayment';
import BookingService from '@services/booking';
import { JWTPayload } from '@services/jwt';
import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Respond } from '@utils/respond';
import { PaymentVerifyValidationResult } from '../tourguide/tourguide.validator';
import {
	AllocateGuideValidationResult,
	CreateBookingValidationResult,
	PackageBookingValidationResult,
} from './booking.validator';
import { RAZORPAY_API_KEY } from '@config/const';

async function createCustomisedBooking(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload;
		const data = req.locals.data as CreateBookingValidationResult;

		const result = await BookingService.createBooking(data, new Types.ObjectId(user.userId));

		return Respond({
			res,
			status: 200,
			data: result.data,
		});
	} catch (error) {
		return next(error);
	}
}

async function createGuestBooking(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as CreateBookingValidationResult;

		const result = await BookingService.createGuestBooking(data);

		return Respond({
			res,
			status: 201,
			data: result.data,
		});
	} catch (error) {
		return next(error);
	}
}

async function getMyBookings(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload;

		const bookings = await BookingService.getMyBookings(new Types.ObjectId(user.userId));

		return Respond({
			res,
			status: 200,
			data: {
				bookings,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getBookingById(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload;
		const bookingId = req.locals.id!;

		const booking = await BookingService.getBookingById(
			bookingId,
			new Types.ObjectId(user.userId),
			user.role
		);

		return Respond({
			res,
			status: 200,
			data: booking,
		});
	} catch (error) {
		return next(error);
	}
}

async function getAllBookings(req: Request, res: Response, next: NextFunction) {
	try {
		const bookings = await BookingService.getAllBookings();

		return Respond({
			res,
			status: 200,
			data: {
				bookings,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function allocateGuide(req: Request, res: Response, next: NextFunction) {
	try {
		const bookingId = req.locals.id!;
		const data = req.locals.data as AllocateGuideValidationResult;

		const booking = await BookingService.allocateGuide(
			bookingId,
			new Types.ObjectId(data.guide_id)
		);

		return Respond({
			res,
			status: 200,
			data: booking,
		});
	} catch (error) {
		return next(error);
	}
}

async function getMyReservations(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload;

		const bookings = await BookingService.getMyReservations(new Types.ObjectId(user.userId));

		return Respond({
			res,
			status: 200,
			data: {
				bookings,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getTransactionStatus(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload;
		const bookingId = req.locals.id!;

		const transactionStatus = await BookingService.getTransactionStatus(
			bookingId,
			new Types.ObjectId(user.userId),
			user.role
		);

		return Respond({
			res,
			status: 200,
			data: transactionStatus,
		});
	} catch (error) {
		return next(error);
	}
}

async function getRazorpayKey(req: Request, res: Response, next: NextFunction) {
	try {
		return Respond({
			res,
			status: 200,
			data: {
				key: RAZORPAY_API_KEY,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function verifyAndCreateGuestBooking(req: Request, res: Response, next: NextFunction) {
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_data } = req.body;

		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_data) {
			return res.status(400).json({
				success: false,
				message: 'Missing required payment details',
			});
		}

		// `user_id` is deliberately NOT read from the body. This route is
		// unauthenticated, so a caller-supplied account id is an identity claim
		// nobody has verified — it let anyone attach a booking to any account by
		// supplying its ObjectId. A guest booking has no owner; a tourist who
		// wants one linked to their account goes through /verify-booking, which
		// takes the id from the session instead.
		const booking = await BookingService.verifyAndCreateBooking({
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			booking_data,
		});

		return Respond({
			res,
			status: 201,
			data: booking,
		});
	} catch (error) {
		return next(error);
	}
}

async function deleteBooking(req: Request, res: Response, next: NextFunction) {
	try {
		const bookingId = req.locals.id!;

		const result = await BookingService.deleteBooking(bookingId);

		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function verifyAndCreateBooking(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload;
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_data } = req.body;

		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_data) {
			return res.status(400).json({
				success: false,
				message: 'Missing required payment details',
			});
		}

		const booking = await BookingService.verifyAndCreateBooking({
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			booking_data,
			user_id: user.userId,
		});

		return Respond({
			res,
			status: 201,
			data: booking,
		});
	} catch (error) {
		return next(error);
	}
}

async function createPackageBooking(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload;
		const data = req.locals.data as PackageBookingValidationResult;

		const result = await BookingService.createPackageOrder(
			data,
			new Types.ObjectId(user.userId)
		);

		return Respond({
			res,
			status: 200,
			data: result.data,
		});
	} catch (error) {
		return next(error);
	}
}

async function verifyPackageBooking(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user as JWTPayload;
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_data } = req.body;

		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_data) {
			return res.status(400).json({
				success: false,
				message: 'Missing required payment details',
			});
		}

		const booking = await BookingService.verifyAndCreatePackageBooking({
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			booking_data,
			user_id: user.userId,
		});

		return Respond({
			res,
			status: 201,
			data: booking,
		});
	} catch (error) {
		return next(error);
	}
}

/**
 * Collect the balance left on a booking that was confirmed with an advance.
 * Shared with the direct-booking flow — both split payment the same way, so both
 * settle through BalancePaymentService rather than each rolling their own.
 */
async function createBalanceOrder(req: Request, res: Response, next: NextFunction) {
	try {
		const order = await BalancePaymentService.createOrder(req.locals.id!, req.locals.user!);
		return Respond({ res, status: 200, data: order });
	} catch (error) {
		return next(error);
	}
}

async function verifyBalancePayment(req: Request, res: Response, next: NextFunction) {
	try {
		const payload = req.locals.data as PaymentVerifyValidationResult;
		const booking = await BalancePaymentService.verify(req.locals.id!, payload, req.locals.user!);

		return Respond({ res, status: 200, data: booking });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	createCustomisedBooking,
	createGuestBooking,
	verifyAndCreateGuestBooking,
	verifyAndCreateBooking,
	createPackageBooking,
	verifyPackageBooking,
	getMyBookings,
	getBookingById,
	getAllBookings,
	allocateGuide,
	getMyReservations,
	getTransactionStatus,
	getRazorpayKey,
	deleteBooking,
	createBalanceOrder,
	verifyBalancePayment,
};

export default Controller;
