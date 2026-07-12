import { AccountDB, BookingDB, TransactionDB } from '@mongo';
import IBooking from '@mongo/types/booking';
import { JWTPayload } from '@services/jwt';
import { verifyRazorpaySignature } from '@utils/paymentVerify';
import { Types } from 'mongoose';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ServerError,
} from 'node-be-utilities';
import InvoiceService from './invoice';
import NotificationService from './notification';
import TransactionService from './transaction';

/**
 * Collecting the outstanding balance on a booking that was confirmed with an
 * advance. Shared by package tours and direct guide bookings — both split
 * payment the same way, so both settle it the same way.
 *
 * Kept out of services/payment.ts on purpose: that file is the Razorpay webhook
 * path and is deliberately left alone.
 */
const BALANCE_REFERENCE_TYPE = 'booking_balance';

class BalancePaymentService {
	private assertOwner(booking: IBooking, user: JWTPayload) {
		if (user.role === 'admin') return;
		if (booking.linked_to?.toString() !== user.userId) {
			throw new ForbiddenError('You do not have access to this booking');
		}
	}

	private assertPayable(booking: IBooking) {
		if (booking.status === 'cancelled') {
			throw new ConflictError('This booking has been cancelled');
		}
		if (!booking.balance_due || booking.balance_due <= 0) {
			throw new BadRequestError('There is no balance outstanding on this booking');
		}
	}

	/**
	 * Open a Razorpay order for whatever is still owed. The amount is read from
	 * the booking, never from the request — the client cannot choose what it pays.
	 */
	async createOrder(bookingId: Types.ObjectId | string, user: JWTPayload) {
		const booking = await BookingDB.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		this.assertOwner(booking, user);
		this.assertPayable(booking);

		const account = await AccountDB.findById(booking.linked_to ?? user.userId);
		if (!account) {
			throw new NotFoundError('Account not found');
		}

		const amount = booking.balance_due!;

		const transaction = await TransactionService.createTransaction(
			{
				name: account.name,
				email: account.email,
				phone_number: account.phone || 'N/A',
			},
			amount,
			{
				reference_id: booking._id.toString(),
				reference_type: BALANCE_REFERENCE_TYPE,
				type: 'tourist',
				description: 'Get My Guide — balance payment',
			}
		);

		// Pin the order to the booking. verify() refuses any order id that isn't
		// this one, so a signature from an unrelated (cheaper) order can't be
		// replayed to settle this balance.
		booking.balance_order_id = transaction.razorpay_options.order_id;
		await booking.save();

		return {
			...transaction,
			booking_id: booking._id.toString(),
			amount_due: amount,
		};
	}

	async verify(
		bookingId: Types.ObjectId | string,
		params: {
			razorpay_order_id: string;
			razorpay_payment_id: string;
			razorpay_signature: string;
		},
		user: JWTPayload
	) {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

		const booking = await BookingDB.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		this.assertOwner(booking, user);

		if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
			throw new ServerError('Payment verification failed: invalid signature');
		}

		if (booking.balance_order_id && booking.balance_order_id !== razorpay_order_id) {
			throw new ServerError('Payment verification failed: this order does not belong to this booking');
		}

		const transaction = await TransactionDB.findOne({
			razorpay_order_id,
			reference_id: booking._id.toString(),
			reference_type: BALANCE_REFERENCE_TYPE,
		});
		if (!transaction) {
			throw new NotFoundError('Transaction not found for this booking');
		}

		// Already settled by an earlier call (or the webhook) — a double-submit of
		// the Razorpay handler must not double-count the payment.
		if (transaction.status === 'paid' || transaction.status === 'success') {
			return booking;
		}

		const outstanding = booking.balance_due ?? 0;
		if (transaction.amount !== outstanding) {
			throw new ServerError('Payment verification failed: amount does not match the balance due');
		}

		transaction.razorpay_payment_id = razorpay_payment_id;
		transaction.status = 'paid';
		await transaction.save();

		booking.advance_paid = (booking.advance_paid ?? 0) + outstanding;
		booking.balance_due = 0;
		booking.balance_paid_at = new Date();
		booking.statusHistory = [
			...(booking.statusHistory ?? []),
			{ status: booking.status, at: new Date(), note: 'Balance paid in full' },
		];
		await booking.save();

		try {
			await InvoiceService.createBookingInvoice(transaction, booking);
		} catch {
			// Non-blocking — the money is in; an invoice failure must not undo that.
		}

		if (booking.linked_to) {
			await NotificationService.create({
				recipient: booking.linked_to,
				type: 'payment_successful',
				title: 'Balance paid',
				message: `Your balance of ₹${outstanding.toLocaleString('en-IN')} has been received. Your booking is paid in full.`,
				relatedEntity: { kind: 'Booking', id: booking._id.toString() },
				dedupeKey: `balance_paid:${booking._id.toString()}`,
			});
		}

		return booking;
	}

	/**
	 * Nudge tourists whose trip is near but whose balance is still outstanding.
	 * Called by the notification watcher; the dedupe key keeps it to one ping per
	 * booking regardless of how often the watcher runs.
	 */
	async remindOutstandingBalances(withinDays: number): Promise<number> {
		const horizon = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);

		const bookings = await BookingDB.find({
			balance_due: { $gt: 0 },
			status: { $in: ['confirmed', 'allocated', 'successful'] },
			'travel_details.date': { $gte: new Date(), $lte: horizon },
			linked_to: { $ne: null },
		})
			.limit(200)
			.lean();

		let sent = 0;
		for (const booking of bookings) {
			const created = await NotificationService.create({
				recipient: booking.linked_to!,
				type: 'balance_due',
				title: 'Balance payment due',
				message: `Your trip is coming up and ₹${(booking.balance_due ?? 0).toLocaleString('en-IN')} is still outstanding. Please pay the balance to keep your booking.`,
				relatedEntity: { kind: 'Booking', id: booking._id.toString() },
				dedupeKey: `balance_due:${booking._id.toString()}`,
			});
			if (created) sent += 1;
		}

		return sent;
	}
}

export default new BalancePaymentService();
