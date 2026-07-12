import {
	AccountDB,
	AssignmentDB,
	BookingDB,
	EarningDB,
	RefundRequestDB,
	TransactionDB,
	TripDB,
} from '@mongo';
import { JWTPayload } from '@services/jwt';
import { Types } from 'mongoose';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

// The Razorpay call is the only thing in this service that reaches the outside
// world. Mocked at the transaction-service boundary so the refund *decision*
// logic is what is under test, not the HTTP client.
jest.mock('@services/transaction', () => ({
	__esModule: true,
	default: {
		refundPayment: jest.fn(),
	},
}));

import TransactionService from '@services/transaction';
import RefundService from '@services/refund';

const mockRefundPayment = TransactionService.refundPayment as jest.Mock;

function bookingFixture(price: number, overrides: Record<string, any> = {}) {
	return {
		tourist_info: {
			name: 'Jane Doe',
			gender: 'female' as const,
			phone: '+1234567890',
			email: 'jane@example.com',
			country: 'USA',
		},
		travel_details: {
			places: ['Amber Fort'],
			city: 'Jaipur',
			date: new Date('2026-12-25'),
			no_of_person: 2,
			preferences: { hotel: false, taxi: false },
		},
		guide_preferences: { guide_language: ['English'], gender: 'none' as const },
		booking_configuration: {
			duration: 'full-day' as const,
			foreign_language_required: false,
			early_late_hours: false,
			extra_city_allowances: false,
			special_event_allowances: [],
			price,
		},
		transaction_id: `txn-${new Types.ObjectId().toString()}`,
		status: 'allocated' as const,
		...overrides,
	};
}

describe('RefundService', () => {
	let touristId: Types.ObjectId;
	let otherTouristId: Types.ObjectId;
	let guideId: Types.ObjectId;
	let adminId: Types.ObjectId;

	let tourist: JWTPayload;
	let otherTourist: JWTPayload;
	let admin: JWTPayload;

	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		mockRefundPayment.mockReset();
		mockRefundPayment.mockResolvedValue({ id: 'rfnd_test_1', amount: 0, status: 'processed' });

		const t = await AccountDB.create({
			name: 'Jane Doe',
			email: 'jane@example.com',
			phone: '+911111111111',
			password: 'Password@123',
			role: 'tourist',
		});
		touristId = t._id;
		tourist = { userId: touristId.toString(), role: 'tourist' } as JWTPayload;

		const o = await AccountDB.create({
			name: 'Someone Else',
			email: 'else@example.com',
			phone: '+914444444444',
			password: 'Password@123',
			role: 'tourist',
		});
		otherTouristId = o._id;
		otherTourist = { userId: otherTouristId.toString(), role: 'tourist' } as JWTPayload;

		const g = await AccountDB.create({
			name: 'Ravi Guide',
			email: 'ravi@example.com',
			phone: '+912222222222',
			password: 'Password@123',
			role: 'guide',
		});
		guideId = g._id;

		const a = await AccountDB.create({
			name: 'Ops Admin',
			email: 'admin@example.com',
			phone: '+913333333333',
			password: 'Password@123',
			role: 'admin',
		});
		adminId = a._id;
		admin = { userId: adminId.toString(), role: 'admin' } as JWTPayload;
	});

	/** A live booking owned by `tourist`, with `payments` captured against it. */
	async function bookingWithPayments(price: number, payments: number[], overrides = {}) {
		const booking = await BookingDB.create(
			bookingFixture(price, { linked_to: touristId, allocated_guide: guideId, ...overrides })
		);

		for (const [index, amount] of payments.entries()) {
			await TransactionDB.create({
				reference_id: booking._id.toString(),
				reference_type: index === 0 ? 'booking' : 'booking_balance',
				type: 'tourist',
				razorpay_order_id: `order_${booking._id.toString()}_${index}`,
				razorpay_customer_id: 'cust_1',
				razorpay_payment_id: `pay_${index}`,
				transaction_id: `txn_${booking._id.toString()}_${index}`,
				status: 'paid',
				amount,
				currency: 'INR',
			});
		}

		return booking;
	}

	describe('requestCancellation', () => {
		it('opens a pending request and snapshots everything actually paid', async () => {
			// Advance 1000 + balance 4000 — amountPaid must be the sum, not just the advance.
			const booking = await bookingWithPayments(5000, [1000, 4000]);

			const request = await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'My flight was cancelled',
			});

			expect(request.status).toBe('pending');
			expect(request.amountPaid).toBe(5000);
			expect(request.refundCode).toMatch(/^RF\d{6}$/);
		});

		// The whole point of the admin-approval model: asking does not cancel.
		it('leaves the booking live until an admin decides', async () => {
			const booking = await bookingWithPayments(5000, [1000]);

			await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'Change of plans',
			});

			const after = await BookingDB.findById(booking._id);
			expect(after!.status).toBe('allocated');
			expect(after!.cancellation?.cancelledAt).toBeUndefined();
		});

		// Guarded by a partial unique index, not a check-then-write race.
		it('refuses a second request while one is still awaiting review', async () => {
			const booking = await bookingWithPayments(5000, [1000]);

			await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'First request',
			});

			await expect(
				RefundService.requestCancellation({
					bookingId: booking._id.toString(),
					user: tourist,
					reason: 'Second request',
				})
			).rejects.toThrow(ConflictError);

			expect(await RefundRequestDB.countDocuments({ booking: booking._id })).toBe(1);
		});

		it("refuses a tourist trying to cancel someone else's booking", async () => {
			const booking = await bookingWithPayments(5000, [1000]);

			await expect(
				RefundService.requestCancellation({
					bookingId: booking._id.toString(),
					user: otherTourist,
					reason: 'Not mine',
				})
			).rejects.toThrow(ForbiddenError);
		});

		it('refuses to cancel a completed booking', async () => {
			const booking = await bookingWithPayments(5000, [5000], { status: 'completed' });

			await expect(
				RefundService.requestCancellation({
					bookingId: booking._id.toString(),
					user: tourist,
					reason: 'Too late',
				})
			).rejects.toThrow(ConflictError);
		});
	});

	describe('approve', () => {
		async function pendingRequest(price: number, payments: number[]) {
			const booking = await bookingWithPayments(price, payments);
			const request = await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'Change of plans',
			});
			return { booking, request };
		}

		it('cancels the booking and refunds the approved amount', async () => {
			const { booking, request } = await pendingRequest(5000, [5000]);

			const decided = await RefundService.approve({
				refundId: request._id,
				approvedAmount: 5000,
				adminNote: 'Full refund, cancelled in good time',
				adminUserId: adminId.toString(),
			});

			expect(decided.status).toBe('processed');
			expect(decided.approvedAmount).toBe(5000);
			expect(mockRefundPayment).toHaveBeenCalledWith('pay_0', 5000, expect.any(String), 'booking_cancelled');

			const after = await BookingDB.findById(booking._id);
			expect(after!.status).toBe('cancelled');
			expect(after!.cancellation?.cancelledAt).toBeDefined();
		});

		// A partial refund should claw back the most recent payment first.
		it('spreads a partial refund across payments, newest first', async () => {
			const { request } = await pendingRequest(5000, [1000, 4000]);

			await RefundService.approve({
				refundId: request._id,
				approvedAmount: 4500,
				adminUserId: adminId.toString(),
			});

			// Newest payment (the 4000 balance) is fully clawed back, then 500 of the advance.
			expect(mockRefundPayment).toHaveBeenCalledTimes(2);
			expect(mockRefundPayment).toHaveBeenNthCalledWith(1, 'pay_1', 4000, expect.any(String), 'booking_cancelled');
			expect(mockRefundPayment).toHaveBeenNthCalledWith(2, 'pay_0', 500, expect.any(String), 'booking_cancelled');
		});

		// Cancelling with nothing back is a legitimate decision, not an error.
		it('cancels with no refund when the approved amount is zero', async () => {
			const { booking, request } = await pendingRequest(5000, [1000]);

			const decided = await RefundService.approve({
				refundId: request._id,
				approvedAmount: 0,
				adminNote: 'Cancelled too late to refund',
				adminUserId: adminId.toString(),
			});

			expect(decided.status).toBe('processed');
			expect(decided.refunds).toHaveLength(0);
			expect(mockRefundPayment).not.toHaveBeenCalled();
			expect((await BookingDB.findById(booking._id))!.status).toBe('cancelled');
		});

		it('refuses to refund more than the tourist actually paid', async () => {
			const { request } = await pendingRequest(5000, [1000]);

			await expect(
				RefundService.approve({
					refundId: request._id,
					approvedAmount: 5000, // only 1000 was ever captured
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(BadRequestError);

			expect(mockRefundPayment).not.toHaveBeenCalled();
		});

		it('frees the guide by declining their live assignment and cancelling the trip', async () => {
			const { booking, request } = await pendingRequest(5000, [5000]);

			const assignment = await AssignmentDB.create({
				booking: booking._id,
				guide: guideId,
				assignedBy: adminId,
				status: 'accepted',
			});
			const trip = await TripDB.create({
				booking: booking._id,
				assignment: assignment._id,
				guide: guideId,
				status: 'not-started',
			});

			await RefundService.approve({
				refundId: request._id,
				approvedAmount: 5000,
				adminUserId: adminId.toString(),
			});

			expect((await AssignmentDB.findById(assignment._id))!.status).toBe('declined');
			expect((await TripDB.findById(trip._id))!.status).toBe('cancelled');
		});

		it('reverses an unpaid guide earning on the cancelled booking', async () => {
			const { booking, request } = await pendingRequest(5000, [5000]);

			const trip = await TripDB.create({
				booking: booking._id,
				assignment: new Types.ObjectId(),
				guide: guideId,
				status: 'completed',
			});
			const earning = await EarningDB.create({
				guide: guideId,
				booking: booking._id,
				trip: trip._id,
				grossAmount: 5000,
				commissionRate: 20,
				commissionAmount: 1000,
				netAmount: 4000,
				status: 'payable',
				payableAt: new Date(),
			});

			await RefundService.approve({
				refundId: request._id,
				approvedAmount: 5000,
				adminUserId: adminId.toString(),
			});

			expect((await EarningDB.findById(earning._id))!.status).toBe('reversed');
		});

		// The booking must still be cancelled: a payments failure is a money problem
		// to retry, not a reason to leave a guide holding a slot for a dead trip.
		it('still cancels the booking when Razorpay refuses the refund', async () => {
			mockRefundPayment.mockRejectedValue(new Error('Razorpay is down'));
			const { booking, request } = await pendingRequest(5000, [5000]);

			const decided = await RefundService.approve({
				refundId: request._id,
				approvedAmount: 5000,
				adminUserId: adminId.toString(),
			});

			expect(decided.status).toBe('failed');
			expect(decided.refunds[0].status).toBe('failed');
			expect(decided.refunds[0].failureReason).toBe('Razorpay is down');
			expect((await BookingDB.findById(booking._id))!.status).toBe('cancelled');
		});

		it('refuses to decide a request twice', async () => {
			const { request } = await pendingRequest(5000, [5000]);

			await RefundService.approve({
				refundId: request._id,
				approvedAmount: 5000,
				adminUserId: adminId.toString(),
			});

			await expect(
				RefundService.approve({
					refundId: request._id,
					approvedAmount: 5000,
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(ConflictError);
		});

		it('throws when the request does not exist', async () => {
			await expect(
				RefundService.approve({
					refundId: new Types.ObjectId(),
					approvedAmount: 0,
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('reject', () => {
		it('leaves the booking live and clears the pending-cancellation marker', async () => {
			const booking = await bookingWithPayments(5000, [5000]);
			const request = await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'Change of plans',
			});

			const decided = await RefundService.reject({
				refundId: request._id,
				adminNote: 'Outside the cancellation window',
				adminUserId: adminId.toString(),
			});

			expect(decided.status).toBe('rejected');
			expect(mockRefundPayment).not.toHaveBeenCalled();

			// $unset clears the fields; Mongoose still materialises the emptied
			// nested path as {}, so assert on the marker itself rather than on the
			// container being absent.
			const after = await BookingDB.findById(booking._id);
			expect(after!.status).toBe('allocated');
			expect(after!.cancellation?.refundRequest).toBeUndefined();
			expect(after!.cancellation?.reason).toBeUndefined();
			expect(after!.cancellation?.cancelledAt).toBeUndefined();
		});

		// A rejection is not final for the booking — the tourist may ask again with
		// a better reason, so the unique index must no longer block them.
		it('lets the tourist ask again after a rejection', async () => {
			const booking = await bookingWithPayments(5000, [5000]);
			const first = await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'Change of plans',
			});

			await RefundService.reject({
				refundId: first._id,
				adminNote: 'Need more detail',
				adminUserId: adminId.toString(),
			});

			await expect(
				RefundService.requestCancellation({
					bookingId: booking._id.toString(),
					user: tourist,
					reason: 'Hospitalised — here is the certificate',
				})
			).resolves.toMatchObject({ status: 'pending' });
		});
	});

	describe('retry', () => {
		it('re-attempts only the failed legs and never double-pays a good one', async () => {
			const booking = await bookingWithPayments(5000, [1000, 4000]);
			const request = await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'Change of plans',
			});

			// The newest leg (4000) succeeds; the advance leg (1000) fails.
			mockRefundPayment
				.mockResolvedValueOnce({ id: 'rfnd_ok', amount: 4000, status: 'processed' })
				.mockRejectedValueOnce(new Error('Razorpay is down'));

			const failed = await RefundService.approve({
				refundId: request._id,
				approvedAmount: 5000,
				adminUserId: adminId.toString(),
			});
			expect(failed.status).toBe('failed');

			mockRefundPayment.mockReset();
			mockRefundPayment.mockResolvedValue({ id: 'rfnd_retry', amount: 1000, status: 'processed' });

			const retried = await RefundService.retry({
				refundId: request._id,
				adminUserId: adminId.toString(),
			});

			expect(retried.status).toBe('processed');
			// Only the leg that failed is re-sent — the 4000 that already went
			// through is not refunded a second time.
			expect(mockRefundPayment).toHaveBeenCalledTimes(1);
			expect(mockRefundPayment).toHaveBeenCalledWith('pay_0', 1000, expect.any(String), 'booking_cancelled');
		});

		it('refuses to retry a refund that did not fail', async () => {
			const booking = await bookingWithPayments(5000, [5000]);
			const request = await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'Change of plans',
			});

			await RefundService.approve({
				refundId: request._id,
				approvedAmount: 5000,
				adminUserId: adminId.toString(),
			});

			await expect(
				RefundService.retry({ refundId: request._id, adminUserId: adminId.toString() })
			).rejects.toThrow(ConflictError);
		});
	});

	describe('getById', () => {
		it("refuses to show a tourist someone else's refund request", async () => {
			const booking = await bookingWithPayments(5000, [5000]);
			const request = await RefundService.requestCancellation({
				bookingId: booking._id.toString(),
				user: tourist,
				reason: 'Change of plans',
			});

			await expect(RefundService.getById(request._id, otherTourist)).rejects.toThrow(
				ForbiddenError
			);
			await expect(RefundService.getById(request._id, admin)).resolves.toMatchObject({
				status: 'pending',
			});
		});
	});
});
