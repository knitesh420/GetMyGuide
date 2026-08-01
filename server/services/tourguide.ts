import { BOOKING_ADVANCE_RATE } from '@config/const';
import { AccountDB, AssignmentDB, BookingDB, GuideDB, TransactionDB } from '@mongo';
import IBooking from '@mongo/types/booking';
import ITransaction from '@mongo/types/transaction';
import { JWTPayload } from '@services/jwt';
import { getBookingOccupiedRange } from '@utils/bookingOccupiedRange';
import { isMembershipActive } from '@utils/guideMembership';
import { refEquals } from '@utils/refId';
import { verifyRazorpaySignature } from '@utils/paymentVerify';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ServerError,
	error as logError,
} from 'node-be-utilities';
import ActivityLogService from './activityLog';
import AssignmentService from './assignment';
import GuideAvailabilityService from './guideAvailability';
import InvoiceService from './invoice';
import NotificationService from './notification';
import TransactionService from './transaction';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The tourist picks a specific guide off their public profile and pays an
 * advance against that guide's published day rate. Distinct from the admin-
 * allocated flow in booking.ts: the guide is known at creation, so there is no
 * allocation step — but the guide still gets an Assignment to accept or decline,
 * which is what feeds the existing Trip and earnings machinery.
 */

interface DirectBookingInput {
	guideId: string;
	location: string;
	language: string;
	startDate: Date;
	endDate: Date;
	numberOfTravelers: number;
}

/**
 * The terms of a direct booking as snapshotted onto the transaction at order
 * creation. Dates arrive as `Date` from `transaction.metadata` and as ISO
 * strings from the client's base64 copy, so both are accepted.
 */
interface DirectBookingTerms {
	guideId: string;
	location: string;
	language: string;
	startDate: string | Date;
	endDate: string | Date;
	numberOfTravelers: number;
}

interface PageParams {
	page?: number;
	limit?: number;
}

function daysBetween(start: Date, end: Date): number {
	const from = new Date(start).setHours(0, 0, 0, 0);
	const to = new Date(end).setHours(0, 0, 0, 0);
	// Inclusive of both ends: a single-day trip is one day, not zero.
	return Math.max(1, Math.round((to - from) / ONE_DAY_MS) + 1);
}

class TourGuideService {
	/**
	 * Price a direct booking from the guide's published rate. The client never
	 * supplies a price — it is derived here and again at verify time, so a
	 * tampered order cannot buy a trip for less than the guide charges.
	 */
	async quote(input: Pick<DirectBookingInput, 'guideId' | 'startDate' | 'endDate'>) {
		const profile = await GuideDB.findOne({ accountId: input.guideId }).lean();
		if (!profile) {
			throw new NotFoundError('Guide profile not found');
		}
		if (!profile.pricing?.fullDay || profile.pricing.fullDay <= 0) {
			throw new BadRequestError('This guide has not published their rates yet and cannot be booked directly');
		}
		if ((profile.approvalStatus ?? 'pending') !== 'approved') {
			throw new BadRequestError('This guide is not approved for bookings yet');
		}

		const days = daysBetween(input.startDate, input.endDate);
		const dayRate = profile.pricing.fullDay;
		const totalPrice = dayRate * days;
		const advance = Math.round(totalPrice * BOOKING_ADVANCE_RATE);

		return {
			guideId: input.guideId,
			days,
			dayRate,
			totalPrice,
			advance,
			balance: totalPrice - advance,
		};
	}

	/**
	 * Open the advance-payment order. Availability is checked here, before any
	 * money is taken — refusing up front is far better than refunding later.
	 */
	async createOrder(input: DirectBookingInput, user: JWTPayload) {
		const guide = await AccountDB.findById(input.guideId);
		if (!guide || guide.role !== 'guide') {
			throw new NotFoundError('Guide not found');
		}

		if (input.endDate < input.startDate) {
			throw new BadRequestError('The end date cannot be before the start date');
		}

		// Booking protection: a guide whose membership has lapsed (or was never
		// activated) must not take NEW bookings, even if they are still approved
		// and have rates. This is checked here, before any money is taken — the
		// same rule that removes them from public listings. The verify path below
		// deliberately does NOT re-run this: once the tourist has paid, a window
		// that expires mid-checkout must not cost them their booking.
		const profile = await GuideDB.findOne({ accountId: input.guideId }).lean();
		if (!isMembershipActive(profile)) {
			throw new BadRequestError(
				'This guide is not currently accepting bookings. Their membership is inactive.'
			);
		}

		const pricing = await this.quote(input);

		const { hasConflict, conflicts } = await GuideAvailabilityService.checkGuideConflict(
			input.guideId,
			{ start: new Date(input.startDate), end: new Date(input.endDate) }
		);
		if (hasConflict) {
			throw new ConflictError(
				`This guide is not available for those dates: ${conflicts.map((c) => c.reason).join('; ')}`
			);
		}

		const account = await AccountDB.findById(user.userId);
		if (!account) {
			throw new NotFoundError('Account not found');
		}

		// The terms of this order. Kept server-side on the transaction (below) and
		// ALSO handed to the browser, which needs them to render the checkout —
		// but only the server-side copy is trusted at verify time.
		//
		// Recomputing the price at verify is not sufficient on its own: many
		// (guide, date-range) pairs produce the same advance, so a blob swapped
		// between paying and redeeming can pass the amount check while buying a
		// different, longer trip than the one paid for.
		const booking_terms = {
			guideId: input.guideId,
			location: input.location,
			language: input.language,
			startDate: input.startDate,
			endDate: input.endDate,
			numberOfTravelers: input.numberOfTravelers,
		};

		const booking_data = Buffer.from(JSON.stringify(booking_terms)).toString('base64');

		const tempReference = randomBytes(12).toString('base64').slice(0, 16);

		const transaction = await TransactionService.createTransaction(
			{
				name: account.name,
				email: account.email,
				phone_number: account.phone || 'N/A',
			},
			pricing.advance,
			{
				reference_id: tempReference,
				reference_type: 'pending_direct_booking',
				type: 'tourist',
				account: account._id,
				description: `Advance payment for a guided tour with ${guide.name}`,
				metadata: booking_terms,
			}
		);

		return {
			...transaction,
			booking_data,
			user_id: user.userId,
			quote: pricing,
			// The Razorpay handler in the browser reads these two directly.
			id: transaction.razorpay_options.order_id,
			amount: transaction.razorpay_options.amount,
		};
	}

	/**
	 * Verify the advance payment and create the booking.
	 *
	 * If the guide has become unavailable between order and payment, the booking
	 * is still created — the tourist has paid, and losing their money to a race is
	 * not an option. It lands unallocated and admins are told to sort it out.
	 */
	async verifyAndCreate(params: {
		razorpay_order_id: string;
		razorpay_payment_id: string;
		razorpay_signature: string;
		booking_data: string;
		user: JWTPayload;
	}) {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_data, user } = params;

		if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
			throw new ServerError('Payment verification failed: invalid signature');
		}

		const transaction = await TransactionDB.findOne({ razorpay_order_id });
		if (!transaction) {
			throw new NotFoundError('Transaction not found');
		}

		// Prefer the terms recorded on the transaction when the order was opened.
		// The client's copy is accepted only for orders created before those terms
		// started being stored, so checkouts already in flight at deploy time
		// still complete.
		const decoded: DirectBookingTerms =
			(transaction.metadata as DirectBookingTerms | undefined) ??
			(JSON.parse(Buffer.from(booking_data, 'base64').toString()) as DirectBookingTerms);

		return this.fulfillDirectBooking(transaction, decoded, {
			paymentId: razorpay_payment_id,
			userId: user.userId,
		});
	}

	/**
	 * Idempotently turn a captured direct-booking advance into a Booking.
	 *
	 * Shared by the browser verify path and the Razorpay webhook, so the booking
	 * exists whether or not the browser returns after paying. The unique
	 * transaction_id on Booking means one payment yields exactly one booking even
	 * if both callers race — the loser returns the winner's booking. Membership is
	 * deliberately NOT re-checked here: once the tourist has paid, a window that
	 * expired mid-checkout must not cost them their booking (see createOrder).
	 */
	async fulfillDirectBooking(
		transaction: ITransaction,
		decoded: DirectBookingTerms,
		opts: { paymentId?: string; userId?: string } = {}
	): Promise<IBooking> {
		// Already fulfilled — by an earlier call, or by whichever of the webhook
		// and the browser reached here first.
		const already = await BookingDB.findOne({ transaction_id: transaction.transaction_id });
		if (already) return already;

		const startDate = new Date(decoded.startDate);
		const endDate = new Date(decoded.endDate);

		const pricing = await this.quote({ guideId: decoded.guideId, startDate, endDate });
		if (pricing.advance !== transaction.amount) {
			throw new ServerError('Payment verification failed: booking amount mismatch');
		}

		// The owner is the account that opened the order (authoritative — the
		// webhook has no session), falling back to an explicitly-passed id.
		const ownerId = transaction.account?.toString() ?? opts.userId;
		if (!ownerId) {
			throw new ServerError('Cannot fulfil a direct booking without an owning account');
		}

		const [guide, account] = await Promise.all([
			AccountDB.findById(decoded.guideId),
			AccountDB.findById(ownerId),
		]);
		if (!guide || guide.role !== 'guide') {
			throw new NotFoundError('Guide not found');
		}
		if (!account) {
			throw new NotFoundError('Account not found');
		}

		const nights = Math.max(0, pricing.days - 1);

		let booking: IBooking;
		try {
			booking = await BookingDB.create({
				booking_type: 'guide_direct',
				tourist_info: {
					name: account.name,
					gender: 'other',
					phone: account.phone || 'N/A',
					email: account.email,
					country: 'N/A',
				},
				travel_details: {
					places: [decoded.location],
					city: decoded.location,
					date: startDate,
					no_of_person: decoded.numberOfTravelers,
					preferences: { hotel: false, taxi: false },
				},
				guide_preferences: {
					guide_language: decoded.language ? [decoded.language] : [],
					gender: 'none',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					// A multi-day direct booking occupies the guide for the whole span.
					// Encoding it as over-night stays is what makes the existing
					// availability checker see the full range rather than just day one.
					outstation: {
						distance: 0,
						over_night_stay: nights,
						accomodation_meals: false,
						special_excursion: [],
					},
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: pricing.totalPrice,
				},
				end_date: endDate,
				advance_paid: pricing.advance,
				balance_due: pricing.balance,
				linked_to: account._id,
				transaction_id: transaction.transaction_id,
				status: 'successful',
			});
		} catch (err: unknown) {
			// Lost the create race to a concurrent fulfilment — return the winner.
			if ((err as { code?: number })?.code === 11000) {
				const raced = await BookingDB.findOne({ transaction_id: transaction.transaction_id });
				if (raced) return raced;
			}
			throw err;
		}

		transaction.reference_id = booking._id.toString();
		transaction.reference_type = 'booking';
		if (opts.paymentId && !transaction.razorpay_payment_id) {
			transaction.razorpay_payment_id = opts.paymentId;
		}
		transaction.status = 'paid';
		await transaction.save();

		// Hand the guide an Assignment so they can accept or decline, exactly like
		// an admin-allocated booking. Accepting is what creates the Trip, which is
		// what eventually accrues their earning.
		await this.assignChosenGuide(booking, decoded.guideId, ownerId);

		try {
			await InvoiceService.createBookingInvoice(transaction, booking);
		} catch {
			// Non-blocking — the payment succeeded; an invoice failure must not undo it.
		}

		// Re-read: assignChosenGuide has since set allocated_guide and the status.
		const created = await BookingDB.findById(booking._id);
		if (!created) {
			throw new ServerError('Booking was created but could not be read back');
		}

		return created;
	}

	/**
	 * Assign the guide the tourist picked. A conflict here means the guide became
	 * unavailable after the order was opened; the booking survives and admins are
	 * asked to re-allocate rather than the tourist losing their payment.
	 */
	private async assignChosenGuide(booking: IBooking, guideId: string, touristUserId: string) {
		try {
			await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId,
				adminNotes: 'Guide chosen directly by the tourist',
				adminUserId: touristUserId,
			});
		} catch (err) {
			logError('TourGuide: could not assign the chosen guide after payment', {
				bookingId: booking._id.toString(),
				guideId,
				error: err,
			});

			const admins = await AccountDB.find({ role: 'admin', isActive: true }).select('_id').lean();
			await Promise.all(
				admins.map((admin) =>
					NotificationService.create({
						recipient: admin._id,
						type: 'booking_updated',
						title: 'Direct booking needs a guide',
						message: `Booking ${booking.bookingCode ?? booking._id.toString()} was paid for, but the guide the tourist chose is no longer available. Allocate another guide.`,
						relatedEntity: { kind: 'Booking', id: booking._id.toString() },
						dedupeKey: `direct_booking_unassigned:${booking._id.toString()}:${admin._id.toString()}`,
					})
				)
			);
		}
	}

	// ---- Reads ---------------------------------------------------------------

	/**
	 * Who may see a direct booking: an admin, the tourist who booked it, or the
	 * guide allocated to it.
	 *
	 * Compared through `refEquals` rather than `.toString()` because `getById`
	 * populates `allocated_guide` before calling this. A populated field is a
	 * document, and `document.toString()` is '[object Object]', so the plain
	 * comparison never matched and the allocated guide was refused their own
	 * booking. `linked_to` is not populated, which is why only the guide half was
	 * affected. See server/utils/refId.ts.
	 */
	private assertVisible(booking: IBooking, user: JWTPayload) {
		if (user.role === 'admin') return;
		const isTourist = refEquals(booking.linked_to, user.userId);
		const isGuide = refEquals(booking.allocated_guide, user.userId);
		if (!isTourist && !isGuide) {
			throw new ForbiddenError('You do not have access to this booking');
		}
	}

	private paginated(query: Record<string, unknown>, { page = 1, limit = 20 }: PageParams) {
		const skip = (page - 1) * limit;
		return Promise.all([
			BookingDB.find(query)
				.populate('allocated_guide', 'name email phone')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			BookingDB.countDocuments(query),
		]);
	}

	async getUserBookings(user: JWTPayload, { page = 1, limit = 20 }: PageParams = {}) {
		const query = { booking_type: 'guide_direct', linked_to: user.userId };
		const [data, total] = await this.paginated(query, { page, limit });

		return {
			data,
			pagination: { page, totalPages: Math.ceil(total / limit) || 1, totalBookings: total },
		};
	}

	async getAll({ page = 1, limit = 20 }: PageParams = {}) {
		const query = { booking_type: 'guide_direct' };
		const [data, total] = await this.paginated(query, { page, limit });

		return {
			data,
			pagination: { page, totalPages: Math.ceil(total / limit) || 1, totalBookings: total },
		};
	}

	async getById(bookingId: Types.ObjectId | string, user: JWTPayload) {
		const booking = await BookingDB.findById(bookingId)
			.populate('allocated_guide', 'name email phone')
			.lean();

		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		this.assertVisible(booking as IBooking, user);
		return booking;
	}

	/** Every booking allocated to the calling guide, direct or admin-allocated. */
	async getMyGuideBookings(guideUserId: string, { page = 1, limit = 50 }: PageParams = {}) {
		const [data, total] = await this.paginated({ allocated_guide: guideUserId }, { page, limit });

		return {
			data,
			pagination: { page, totalPages: Math.ceil(total / limit) || 1, totalBookings: total },
		};
	}

	async getMyGuideBookingById(guideUserId: string, bookingId: Types.ObjectId | string) {
		const booking = await BookingDB.findOne({ _id: bookingId, allocated_guide: guideUserId })
			.populate('linked_to', 'name email phone')
			.lean();

		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		return booking;
	}

	// ---- Admin mutations -----------------------------------------------------

	/**
	 * Move a booking along its lifecycle by hand. The UI speaks in 'Upcoming' and
	 * 'Completed'; the Booking model has always spoken in its own enum, so map
	 * here rather than leaking the UI's vocabulary into the database.
	 */
	async updateStatus(
		bookingId: Types.ObjectId | string,
		status: 'Upcoming' | 'Completed',
		adminUserId: string
	) {
		const booking = await BookingDB.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}
		if (booking.status === 'cancelled') {
			throw new ConflictError('A cancelled booking cannot change status');
		}

		const mapped = status === 'Completed' ? 'completed' : 'allocated';

		booking.status = mapped;
		booking.statusHistory = [
			...(booking.statusHistory ?? []),
			{ status: mapped, at: new Date(), by: new Types.ObjectId(adminUserId) },
		];
		await booking.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'booking.status_updated',
			targetType: 'Booking',
			targetId: booking._id.toString(),
			description: `Admin set booking ${booking.bookingCode ?? booking._id.toString()} to ${mapped}`,
			metadata: { status: mapped },
		});

		if (booking.linked_to) {
			await NotificationService.create({
				recipient: booking.linked_to,
				type: 'booking_updated',
				title: 'Booking updated',
				message: `Your booking is now marked as ${status.toLowerCase()}.`,
				relatedEntity: { kind: 'Booking', id: booking._id.toString() },
				dedupeKey: `booking_status:${booking._id.toString()}:${mapped}`,
			});
		}

		return booking;
	}

	/**
	 * Swap the guide on a direct booking. Delegates to the existing reassignment
	 * path so the availability check, the decline of the old assignment and the
	 * notifications all behave exactly as they do for admin-allocated bookings.
	 */
	async reassignGuide(params: {
		bookingId: Types.ObjectId | string;
		newGuideId: string;
		adminUserId: string;
	}) {
		const { bookingId, newGuideId, adminUserId } = params;

		const booking = await BookingDB.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}
		if (booking.status === 'cancelled') {
			throw new ConflictError('A cancelled booking cannot be reassigned');
		}

		const active = await AssignmentDB.findOne({
			booking: bookingId,
			status: { $in: ['pending', 'accepted'] },
		});

		if (active) {
			await AssignmentService.reassignGuide({
				currentAssignmentId: active._id,
				newGuideId,
				adminUserId,
			});
		} else {
			// Nothing live to reassign — e.g. the original guide declined, or the
			// post-payment assignment failed. Assign fresh instead.
			await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: newGuideId,
				adminNotes: 'Assigned by admin after the original guide fell through',
				adminUserId,
			});
		}

		const updated = await BookingDB.findById(bookingId).populate(
			'allocated_guide',
			'name email phone'
		);
		if (!updated) {
			throw new NotFoundError('Booking not found');
		}

		return updated;
	}

	/** The occupied range a direct booking implies — exposed for the calendar. */
	occupiedRange(booking: IBooking) {
		return getBookingOccupiedRange(booking);
	}
}

export default new TourGuideService();
