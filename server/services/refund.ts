import {
	AccountDB,
	AssignmentDB,
	BookingDB,
	RefundRequestDB,
	TransactionDB,
	TripDB,
} from '@mongo';
import IBooking from '@mongo/types/booking';
import IRefundRequest, { RefundLeg, RefundRequestStatus } from '@mongo/types/refundRequest';
import ITransaction from '@mongo/types/transaction';
import { JWTPayload } from '@services/jwt';
import { Types } from 'mongoose';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	error as logError,
} from 'node-be-utilities';
import ActivityLogService from './activityLog';
import EarningService from './earning';
import NotificationService from './notification';
import TransactionService from './transaction';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

/** Statuses from which a booking can still be cancelled. */
const CANCELLABLE_STATUSES = ['payment-pending', 'successful', 'confirmed', 'allocated'];

interface PageParams {
	page?: number;
	limit?: number;
}

function money(value: number): number {
	return Math.round(value * 100) / 100;
}

class RefundService {
	/**
	 * Every payment actually captured against a booking. Both the advance and the
	 * balance leg reference the booking, so this is the true "how much has this
	 * tourist paid us" figure — not `advance_paid`, which ignores the balance.
	 */
	private async paidTransactions(bookingId: string): Promise<ITransaction[]> {
		return TransactionDB.find({
			reference_id: bookingId,
			status: { $in: ['success', 'paid'] },
		})
			.sort({ createdAt: -1 })
			.exec();
	}

	private async amountPaidFor(bookingId: string): Promise<number> {
		const transactions = await this.paidTransactions(bookingId);
		return money(transactions.reduce((sum, t) => sum + t.amount, 0));
	}

	private assertCanRequest(booking: IBooking, user: JWTPayload) {
		const isAdmin = user.role === 'admin';
		const isOwner = booking.linked_to?.toString() === user.userId;
		const isGuide = booking.allocated_guide?.toString() === user.userId;

		if (!isAdmin && !isOwner && !isGuide) {
			throw new ForbiddenError('You do not have access to this booking');
		}

		if (booking.status === 'cancelled') {
			throw new ConflictError('This booking is already cancelled');
		}
		if (booking.status === 'completed') {
			throw new ConflictError('A completed booking cannot be cancelled');
		}
		if (!CANCELLABLE_STATUSES.includes(booking.status)) {
			throw new ConflictError(`A booking in state '${booking.status}' cannot be cancelled`);
		}
	}

	/**
	 * Open a cancellation request. Nothing is cancelled and no money moves here —
	 * an admin decides. The booking keeps its current status until then, so a
	 * guide is not stood down on the strength of an unreviewed request.
	 */
	async requestCancellation(params: { bookingId: string; user: JWTPayload; reason: string }) {
		const { bookingId, user, reason } = params;

		const booking = await BookingDB.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		this.assertCanRequest(booking, user);

		const amountPaid = await this.amountPaidFor(bookingId);

		let request: IRefundRequest;
		try {
			request = await RefundRequestDB.create({
				booking: booking._id,
				requestedBy: user.userId,
				requesterRole: user.role,
				reason,
				status: 'pending',
				amountPaid,
			});
		} catch (err: unknown) {
			// The partial unique index on { booking, status: 'pending' } is the
			// guard against a double-submit; translate it rather than 500ing.
			if ((err as { code?: number })?.code === MONGO_DUPLICATE_KEY_ERROR_CODE) {
				throw new ConflictError('A cancellation request for this booking is already awaiting review');
			}
			throw err;
		}

		booking.cancellation = {
			reason,
			requestedBy: new Types.ObjectId(user.userId),
			refundRequest: request._id,
		};
		await booking.save();

		await ActivityLogService.log({
			actor: user.userId,
			action: 'refund.requested',
			targetType: 'RefundRequest',
			targetId: request._id.toString(),
			description: `${user.role} requested cancellation of booking ${booking.bookingCode ?? bookingId}: ${reason}`,
			metadata: { bookingId, amountPaid },
		});

		// Fan out to every admin — there is no single "ops inbox" account.
		const admins = await AccountDB.find({ role: 'admin', isActive: true }).select('_id').lean();
		await Promise.all(
			admins.map((admin) =>
				NotificationService.create({
					recipient: admin._id,
					type: 'refund_requested',
					title: 'Cancellation requested',
					message: `Booking ${booking.bookingCode ?? bookingId} has a cancellation request (₹${amountPaid.toLocaleString('en-IN')} paid). Review it in the refunds queue.`,
					relatedEntity: { kind: 'RefundRequest', id: request._id.toString() },
					dedupeKey: `refund_requested:${request._id.toString()}:${admin._id.toString()}`,
				})
			)
		);

		return request;
	}

	/**
	 * Approve a cancellation and push the refund to Razorpay.
	 *
	 * The booking is cancelled regardless of whether the money leg succeeds — a
	 * failed refund is a payments problem to retry, not a reason to leave the
	 * guide holding a slot for a trip that is not happening.
	 */
	async approve(params: {
		refundId: Types.ObjectId | string;
		approvedAmount: number;
		adminNote?: string;
		adminUserId: string;
	}) {
		const { refundId, approvedAmount, adminNote, adminUserId } = params;

		const request = await RefundRequestDB.findById(refundId);
		if (!request) {
			throw new NotFoundError('Refund request not found');
		}
		if (request.status !== 'pending') {
			throw new ConflictError(`This request has already been ${request.status}`);
		}
		if (approvedAmount > request.amountPaid) {
			throw new BadRequestError(
				`Refund cannot exceed the ₹${request.amountPaid} actually paid for this booking`
			);
		}

		const booking = await BookingDB.findById(request.booking);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		await this.cancelBookingAndDownstream(booking, adminUserId, request.reason);

		const legs = await this.issueRefunds(request.booking.toString(), approvedAmount);
		const anyFailed = legs.some((leg) => leg.status === 'failed');

		request.status = anyFailed ? 'failed' : 'processed';
		request.approvedAmount = approvedAmount;
		request.adminNote = adminNote;
		request.refunds = legs;
		request.processedBy = new Types.ObjectId(adminUserId);
		request.processedAt = new Date();
		await request.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: anyFailed ? 'refund.failed' : 'refund.approved',
			targetType: 'RefundRequest',
			targetId: request._id.toString(),
			description: anyFailed
				? `Approved a ₹${approvedAmount} refund but at least one Razorpay leg failed`
				: `Approved a ₹${approvedAmount} refund for booking ${booking.bookingCode ?? booking._id.toString()}`,
			metadata: { bookingId: booking._id.toString(), approvedAmount, legs: legs.length },
		});

		if (booking.linked_to) {
			await NotificationService.create({
				recipient: booking.linked_to,
				type: 'refund_processed',
				title: 'Booking cancelled',
				message:
					approvedAmount > 0
						? `Your booking has been cancelled and a refund of ₹${approvedAmount.toLocaleString('en-IN')} is on its way. It usually reaches your account in 5–7 working days.`
						: 'Your booking has been cancelled. No refund is due under the terms of this booking.',
				relatedEntity: { kind: 'Booking', id: booking._id.toString() },
				dedupeKey: `refund_processed:${request._id.toString()}`,
			});
		}

		return request;
	}

	async reject(params: { refundId: Types.ObjectId | string; adminNote: string; adminUserId: string }) {
		const { refundId, adminNote, adminUserId } = params;

		const request = await RefundRequestDB.findById(refundId);
		if (!request) {
			throw new NotFoundError('Refund request not found');
		}
		if (request.status !== 'pending') {
			throw new ConflictError(`This request has already been ${request.status}`);
		}

		request.status = 'rejected';
		request.adminNote = adminNote;
		request.processedBy = new Types.ObjectId(adminUserId);
		request.processedAt = new Date();
		await request.save();

		// The booking stays live, so clear the pending-cancellation marker.
		await BookingDB.findByIdAndUpdate(request.booking, { $unset: { cancellation: 1 } });

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'refund.rejected',
			targetType: 'RefundRequest',
			targetId: request._id.toString(),
			description: `Rejected the cancellation request: ${adminNote}`,
			metadata: { bookingId: request.booking.toString() },
		});

		await NotificationService.create({
			recipient: request.requestedBy,
			type: 'refund_rejected',
			title: 'Cancellation declined',
			message: `Your cancellation request was declined. ${adminNote}`,
			relatedEntity: { kind: 'Booking', id: request.booking.toString() },
			dedupeKey: `refund_rejected:${request._id.toString()}`,
		});

		return request;
	}

	/**
	 * Retry the money leg of an approved-but-failed refund. Only the legs that
	 * actually failed are re-attempted, so a partially-successful refund never
	 * double-pays the legs that already went through.
	 */
	async retry(params: { refundId: Types.ObjectId | string; adminUserId: string }) {
		const { refundId, adminUserId } = params;

		const request = await RefundRequestDB.findById(refundId);
		if (!request) {
			throw new NotFoundError('Refund request not found');
		}
		if (request.status !== 'failed') {
			throw new ConflictError('Only a failed refund can be retried');
		}

		const legs: RefundLeg[] = [];
		for (const leg of request.refunds) {
			if (leg.status !== 'failed') {
				legs.push(leg);
				continue;
			}
			legs.push(await this.issueOneRefund(leg.transaction, leg.razorpay_payment_id, leg.amount));
		}

		const anyFailed = legs.some((leg) => leg.status === 'failed');
		request.refunds = legs;
		request.status = anyFailed ? 'failed' : 'processed';
		await request.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: anyFailed ? 'refund.failed' : 'refund.approved',
			targetType: 'RefundRequest',
			targetId: request._id.toString(),
			description: anyFailed ? 'Retried the refund; it failed again' : 'Retried the refund; it succeeded',
		});

		return request;
	}

	/**
	 * Cancel the booking and everything hanging off it: the guide's assignment,
	 * the trip, and any earning that has not yet been paid out.
	 */
	private async cancelBookingAndDownstream(booking: IBooking, adminUserId: string, reason: string) {
		booking.status = 'cancelled';
		booking.cancellation = {
			...(booking.cancellation ?? {}),
			reason,
			cancelledAt: new Date(),
		};
		booking.statusHistory = [
			...(booking.statusHistory ?? []),
			{ status: 'cancelled', at: new Date(), by: new Types.ObjectId(adminUserId), note: reason },
		];
		await booking.save();

		// Free the guide's calendar: an assignment left 'pending'/'accepted' keeps
		// showing as a conflict in the availability checker.
		await AssignmentDB.updateMany(
			{ booking: booking._id, status: { $in: ['pending', 'accepted'] } },
			{ status: 'declined', declineReason: `Booking cancelled: ${reason}` }
		);

		const trip = await TripDB.findOne({ booking: booking._id });
		if (trip && trip.status !== 'completed' && trip.status !== 'cancelled') {
			trip.status = 'cancelled';
			await trip.save();
		}

		const { alreadyPaid } = await EarningService.reverseForBooking(booking._id);
		if (alreadyPaid > 0) {
			logError('Refund: booking cancelled but guide had already been paid out', {
				bookingId: booking._id.toString(),
				paidEarnings: alreadyPaid,
			});
		}

		if (booking.allocated_guide) {
			await NotificationService.create({
				recipient: booking.allocated_guide,
				type: 'booking_cancelled',
				title: 'Booking cancelled',
				message: `A booking assigned to you has been cancelled. Reason: ${reason}`,
				relatedEntity: { kind: 'Booking', id: booking._id.toString() },
				dedupeKey: `booking_cancelled:${booking._id.toString()}:${booking.allocated_guide.toString()}`,
			});
		}
	}

	/**
	 * Spread `total` across the booking's captured payments, newest first, and
	 * refund each. Newest-first means the balance leg is clawed back before the
	 * advance, which is what a partial refund normally intends.
	 */
	private async issueRefunds(bookingId: string, total: number): Promise<RefundLeg[]> {
		if (total <= 0) {
			return [];
		}

		const transactions = await this.paidTransactions(bookingId);
		const legs: RefundLeg[] = [];
		let remaining = total;

		for (const transaction of transactions) {
			if (remaining <= 0) break;
			if (!transaction.razorpay_payment_id) {
				logError('Refund: paid transaction has no razorpay_payment_id, skipping', {
					transactionId: transaction._id.toString(),
				});
				continue;
			}

			const legAmount = money(Math.min(remaining, transaction.amount));
			remaining = money(remaining - legAmount);

			legs.push(await this.issueOneRefund(transaction._id, transaction.razorpay_payment_id, legAmount));
		}

		if (remaining > 0) {
			logError('Refund: could not allocate the full approved amount to any payment', {
				bookingId,
				unallocated: remaining,
			});
		}

		return legs;
	}

	private async issueOneRefund(
		transactionId: Types.ObjectId,
		paymentId: string,
		amount: number
	): Promise<RefundLeg> {
		try {
			const refund = await TransactionService.refundPayment(
				paymentId,
				amount,
				transactionId.toString(),
				'booking_cancelled'
			);
			return {
				transaction: transactionId,
				razorpay_payment_id: paymentId,
				razorpay_refund_id: refund.id,
				amount,
				status: 'processed',
			};
		} catch (err: unknown) {
			return {
				transaction: transactionId,
				razorpay_payment_id: paymentId,
				amount,
				status: 'failed',
				failureReason: err instanceof Error ? err.message : 'Razorpay refund failed',
			};
		}
	}

	async getAll(
		filters: { status?: RefundRequestStatus } = {},
		{ page = 1, limit = 20 }: PageParams = {}
	) {
		const query: Record<string, unknown> = {};
		if (filters.status) query.status = filters.status;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			RefundRequestDB.find(query)
				.populate('booking', 'bookingCode tourist_info travel_details booking_configuration status')
				.populate('requestedBy', 'name email role')
				.populate('processedBy', 'name email')
				.sort({ status: 1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			RefundRequestDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getMy(userId: string, { page = 1, limit = 20 }: PageParams = {}) {
		const skip = (page - 1) * limit;
		const query = { requestedBy: userId };

		const [data, total] = await Promise.all([
			RefundRequestDB.find(query)
				.populate('booking', 'bookingCode travel_details booking_configuration status')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			RefundRequestDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getById(refundId: Types.ObjectId | string, user: JWTPayload) {
		const request = await RefundRequestDB.findById(refundId)
			.populate('booking')
			.populate('requestedBy', 'name email role')
			.populate('processedBy', 'name email')
			.lean();

		if (!request) {
			throw new NotFoundError('Refund request not found');
		}

		if (user.role !== 'admin' && request.requestedBy._id.toString() !== user.userId) {
			throw new ForbiddenError('You do not have access to this refund request');
		}

		return request;
	}
}

export default new RefundService();
