import { EARNING_HOLD_DAYS, PLATFORM_COMMISSION_RATE } from '@config/const';
import { AccountDB, BookingDB, EarningDB, GuideDB, PayoutDB } from '@mongo';
import IEarning, { EarningStatus } from '@mongo/types/earning';
import { PayoutMethod } from '@mongo/types/payout';
import ITrip from '@mongo/types/trip';
import { Types } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError, error as logError } from 'node-be-utilities';
import ActivityLogService from './activityLog';
import NotificationService from './notification';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface PageParams {
	page?: number;
	limit?: number;
}

interface CreatePayoutParams {
	guideId: string;
	earningIds: string[];
	method: PayoutMethod;
	reference: string;
	note?: string;
	adminUserId: string;
}

function money(value: number): number {
	return Math.round(value * 100) / 100;
}

class EarningService {
	/**
	 * Accrue the guide's cut of a completed trip.
	 *
	 * Called from TripService.complete. Never throws: a ledger failure must not
	 * roll back a trip the guide has already finished in the real world. The
	 * unique index on Earning.trip makes a retry (or a double-complete) a no-op
	 * rather than paying twice — the duplicate-key error is the guard, so we
	 * swallow exactly that code and nothing else.
	 */
	async accrueForTrip(trip: ITrip): Promise<IEarning | null> {
		try {
			const booking = await BookingDB.findById(trip.booking).lean();
			if (!booking) {
				logError('Earning: booking missing for completed trip', { tripId: trip._id.toString() });
				return null;
			}

			const grossAmount = booking.booking_configuration?.price ?? 0;
			if (grossAmount <= 0) {
				return null;
			}

			const commissionRate = PLATFORM_COMMISSION_RATE;
			const commissionAmount = money((grossAmount * commissionRate) / 100);
			const netAmount = money(grossAmount - commissionAmount);

			const earning = await EarningDB.create({
				guide: trip.guide,
				booking: booking._id,
				trip: trip._id,
				grossAmount,
				commissionRate,
				commissionAmount,
				netAmount,
				status: 'pending',
				payableAt: new Date(Date.now() + EARNING_HOLD_DAYS * ONE_DAY_MS),
			});

			await NotificationService.create({
				recipient: trip.guide,
				type: 'earning_credited',
				title: 'Earning credited',
				message: `₹${netAmount.toLocaleString('en-IN')} has been credited to your earnings for this trip. It becomes payable in ${EARNING_HOLD_DAYS} days.`,
				relatedEntity: { kind: 'Earning', id: earning._id.toString() },
				dedupeKey: `earning_credited:${earning._id.toString()}`,
			});

			return earning;
		} catch (err: unknown) {
			if ((err as { code?: number })?.code === MONGO_DUPLICATE_KEY_ERROR_CODE) {
				return null;
			}
			logError('Earning: failed to accrue for trip', { tripId: trip._id.toString(), error: err });
			return null;
		}
	}

	/**
	 * Void the earnings tied to a booking that has been refunded. Only touches
	 * rows the platform has not yet paid out — once money has left, reversing
	 * the ledger row would misstate what was actually sent, so a paid earning is
	 * left alone and surfaced to the admin instead.
	 */
	async reverseForBooking(bookingId: Types.ObjectId | string): Promise<{ reversed: number; alreadyPaid: number }> {
		const earnings = await EarningDB.find({ booking: bookingId });

		let reversed = 0;
		let alreadyPaid = 0;

		for (const earning of earnings) {
			if (earning.status === 'paid') {
				alreadyPaid += 1;
				continue;
			}
			if (earning.status === 'reversed') {
				continue;
			}
			earning.status = 'reversed';
			await earning.save();
			reversed += 1;
		}

		return { reversed, alreadyPaid };
	}

	/**
	 * Flip earnings clear of their hold window to 'payable'. Idempotent, so the
	 * background watcher can call it on every tick.
	 */
	async promoteMaturedEarnings(): Promise<number> {
		const result = await EarningDB.updateMany(
			{ status: 'pending', payableAt: { $lte: new Date() } },
			{ status: 'payable' }
		);
		return result.modifiedCount;
	}

	/** A guide's own ledger: lifetime totals plus a paginated list. */
	async getMyEarnings(
		guideUserId: string,
		filters: { status?: EarningStatus } = {},
		{ page = 1, limit = 20 }: PageParams = {}
	) {
		const query: Record<string, unknown> = { guide: guideUserId };
		if (filters.status) query.status = filters.status;

		const skip = (page - 1) * limit;
		const [data, total, summary] = await Promise.all([
			EarningDB.find(query)
				.populate('booking', 'bookingCode travel_details booking_configuration')
				.populate('trip', 'tripCode completedAt')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			EarningDB.countDocuments(query),
			this.summaryFor(guideUserId),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1, summary };
	}

	/** Totals by status, in one aggregation rather than four counts. */
	async summaryFor(guideUserId: string | Types.ObjectId) {
		const rows = await EarningDB.aggregate<{ _id: EarningStatus; total: number; count: number }>([
			{ $match: { guide: new Types.ObjectId(guideUserId.toString()) } },
			{ $group: { _id: '$status', total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
		]);

		const byStatus = (status: EarningStatus) => rows.find((r) => r._id === status);

		const pending = byStatus('pending');
		const payable = byStatus('payable');
		const paid = byStatus('paid');

		return {
			pendingAmount: money(pending?.total ?? 0),
			pendingCount: pending?.count ?? 0,
			payableAmount: money(payable?.total ?? 0),
			payableCount: payable?.count ?? 0,
			paidAmount: money(paid?.total ?? 0),
			paidCount: paid?.count ?? 0,
			// What the guide is still owed, whether or not the hold window has passed.
			outstandingAmount: money((pending?.total ?? 0) + (payable?.total ?? 0)),
			lifetimeAmount: money((pending?.total ?? 0) + (payable?.total ?? 0) + (paid?.total ?? 0)),
		};
	}

	async getAll(
		filters: { status?: EarningStatus; guideId?: string } = {},
		{ page = 1, limit = 20 }: PageParams = {}
	) {
		const query: Record<string, unknown> = {};
		if (filters.status) query.status = filters.status;
		if (filters.guideId) query.guide = filters.guideId;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			EarningDB.find(query)
				.populate('guide', 'name email phone')
				.populate('booking', 'bookingCode travel_details')
				.populate('trip', 'tripCode completedAt')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			EarningDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	/**
	 * The admin payout queue: every guide with at least one payable earning,
	 * with the amount owed and where to send it.
	 */
	async getPayoutQueue() {
		const grouped = await EarningDB.aggregate<{
			_id: Types.ObjectId;
			amount: number;
			count: number;
			earningIds: Types.ObjectId[];
			oldestPayableAt: Date;
		}>([
			{ $match: { status: 'payable' } },
			{
				$group: {
					_id: '$guide',
					amount: { $sum: '$netAmount' },
					count: { $sum: 1 },
					earningIds: { $push: '$_id' },
					oldestPayableAt: { $min: '$payableAt' },
				},
			},
			{ $sort: { oldestPayableAt: 1 } },
		]);

		const guideIds = grouped.map((row) => row._id);
		const [accounts, profiles] = await Promise.all([
			AccountDB.find({ _id: { $in: guideIds } })
				.select('name email phone')
				.lean(),
			GuideDB.find({ accountId: { $in: guideIds } })
				.select('accountId guideCode bankDetails')
				.lean(),
		]);

		return grouped.map((row) => {
			const account = accounts.find((a) => a._id.toString() === row._id.toString());
			const profile = profiles.find((p) => p.accountId.toString() === row._id.toString());
			return {
				guideId: row._id.toString(),
				guideCode: profile?.guideCode ?? null,
				name: account?.name ?? 'Unknown guide',
				email: account?.email ?? '',
				phone: account?.phone ?? '',
				amount: money(row.amount),
				earningCount: row.count,
				earningIds: row.earningIds.map((id) => id.toString()),
				oldestPayableAt: row.oldestPayableAt,
				bankDetails: profile?.bankDetails ?? null,
			};
		});
	}

	/**
	 * Record a payout the admin has already made out-of-band (bank transfer, UPI,
	 * cash). This does not move money — it closes the ledger against a reference
	 * the admin supplies as proof.
	 */
	async createPayout(params: CreatePayoutParams) {
		const { guideId, earningIds, method, reference, note, adminUserId } = params;

		const guide = await AccountDB.findById(guideId);
		if (!guide || guide.role !== 'guide') {
			throw new NotFoundError('Guide not found');
		}

		if (earningIds.length === 0) {
			throw new BadRequestError('Select at least one earning to pay out');
		}

		// Re-read the earnings under the guide filter rather than trusting the
		// ids: this is what stops an admin (or a tampered request) settling one
		// guide's earnings against another guide's payout.
		const earnings = await EarningDB.find({
			_id: { $in: earningIds },
			guide: guideId,
			status: 'payable',
		});

		if (earnings.length !== earningIds.length) {
			throw new ConflictError(
				'Some of the selected earnings are no longer payable — refresh the queue and try again'
			);
		}

		const amount = money(earnings.reduce((sum, e) => sum + e.netAmount, 0));

		const profile = await GuideDB.findOne({ accountId: guideId }).select('bankDetails').lean();
		const accountNumber = profile?.bankDetails?.accountNumber;

		const payout = await PayoutDB.create({
			guide: guideId,
			earnings: earnings.map((e) => e._id),
			amount,
			method,
			reference,
			note,
			paidTo: {
				accountHolderName: profile?.bankDetails?.accountHolderName,
				accountNumberLast4: accountNumber ? accountNumber.slice(-4) : undefined,
				ifsc: profile?.bankDetails?.ifsc,
				upiId: profile?.bankDetails?.upiId,
			},
			paidBy: adminUserId,
			paidAt: new Date(),
		});

		// Guarded on status again so a concurrent payout can't double-settle the
		// same rows; whichever request lands second updates nothing.
		const result = await EarningDB.updateMany(
			{ _id: { $in: earnings.map((e) => e._id) }, status: 'payable' },
			{ status: 'paid', payout: payout._id }
		);

		if (result.modifiedCount !== earnings.length) {
			logError('Earning: payout settled fewer earnings than expected', {
				payoutId: payout._id.toString(),
				expected: earnings.length,
				modified: result.modifiedCount,
			});
		}

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'payout.recorded',
			targetType: 'Payout',
			targetId: payout._id.toString(),
			description: `Recorded a ₹${amount} payout to ${guide.name} via ${method} (ref ${reference})`,
			metadata: { guideId, amount, method, reference, earningCount: earnings.length },
		});

		await NotificationService.create({
			recipient: guideId,
			type: 'payout_paid',
			title: 'Payout sent',
			message: `A payout of ₹${amount.toLocaleString('en-IN')} has been sent to you via ${method.replace('_', ' ')}. Reference: ${reference}.`,
			relatedEntity: { kind: 'Payout', id: payout._id.toString() },
			dedupeKey: `payout_paid:${payout._id.toString()}`,
		});

		return payout;
	}

	async getPayouts(filters: { guideId?: string } = {}, { page = 1, limit = 20 }: PageParams = {}) {
		const query: Record<string, unknown> = {};
		if (filters.guideId) query.guide = filters.guideId;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			PayoutDB.find(query)
				.populate('guide', 'name email phone')
				.populate('paidBy', 'name email')
				.sort({ paidAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			PayoutDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getMyPayouts(guideUserId: string, params: PageParams = {}) {
		return this.getPayouts({ guideId: guideUserId }, params);
	}
}

export default new EarningService();
