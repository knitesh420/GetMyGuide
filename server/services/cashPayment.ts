import { AccountDB, CashPaymentDB } from '@mongo';
import ICashPayment, { CashPaymentPaidBy } from '@mongo/types/cashPayment';
import { Types } from 'mongoose';
import { ConflictError, NotFoundError } from 'node-be-utilities';
import ActivityLogService from './activityLog';
import NotificationService from './notification';

interface PageParams {
	page?: number;
	limit?: number;
}

export interface CashPaymentInput {
	amount: number;
	paymentDate: Date;
	paidBy: CashPaymentPaidBy;
	touristName?: string;
	bookingReference?: string;
	remarks?: string;
}

function money(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * Cash a guide was handed directly — by a tourist at the end of a trip, or by an
 * admin settling up — recorded after the fact by an admin.
 *
 * This never touches `transactions`: an online payment and a manual cash record
 * are independent rows in independent collections, so neither can overwrite the
 * other, and a guide's payment history is simply the union of the two.
 *
 * Nothing here moves money. It is a book-keeping record of money that has
 * already changed hands.
 */
class CashPaymentService {
	/** The guide must exist and actually be a guide before we file money against them. */
	private async requireGuideAccount(guideAccountId: string) {
		const account = await AccountDB.findOne({ _id: guideAccountId, role: 'guide' })
			.select('name email')
			.lean();
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}
		return account;
	}

	async create(params: {
		guideAccountId: string;
		data: CashPaymentInput;
		adminUserId: string;
	}): Promise<ICashPayment> {
		const { guideAccountId, data, adminUserId } = params;

		const account = await this.requireGuideAccount(guideAccountId);
		const admin = new Types.ObjectId(adminUserId);

		const payment = await CashPaymentDB.create({
			guide: account._id,
			amount: money(data.amount),
			paymentDate: data.paymentDate,
			method: 'cash',
			paidBy: data.paidBy,
			touristName: data.touristName,
			bookingReference: data.bookingReference,
			remarks: data.remarks,
			status: 'received',
			// "Recorded By (auto-filled with the admin's account)" — never client-supplied.
			recordedBy: admin,
			createdBy: admin,
		});

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'cash_payment.created',
			targetType: 'CashPayment',
			targetId: payment._id.toString(),
			description: `Recorded a ₹${payment.amount} cash payment to ${account.name} (paid by ${data.paidBy})`,
			metadata: { guideAccountId, amount: payment.amount, paidBy: data.paidBy },
		});

		// The guide sees this in their own Payment History, so tell them it landed.
		await NotificationService.create({
			recipient: account._id,
			type: 'cash_payment_recorded',
			title: 'Cash payment recorded',
			message: `A cash payment of ₹${payment.amount.toLocaleString('en-IN')} has been recorded against your account. You can see it in your payment history.`,
			relatedEntity: { kind: 'CashPayment', id: payment._id.toString() },
			dedupeKey: `cash_payment_recorded:${payment._id.toString()}`,
		});

		return payment;
	}

	async update(params: {
		paymentId: string;
		data: Partial<CashPaymentInput>;
		adminUserId: string;
	}): Promise<ICashPayment> {
		const { paymentId, data, adminUserId } = params;

		const payment = await CashPaymentDB.findById(paymentId);
		if (!payment) {
			throw new NotFoundError('Cash payment not found');
		}
		// A voided record is the audit trail of what was there. Editing it would
		// rewrite history; the admin should record a fresh payment instead.
		if (payment.status === 'voided') {
			throw new ConflictError('This payment has been voided and can no longer be edited');
		}

		const before = { amount: payment.amount, paymentDate: payment.paymentDate };

		if (data.amount !== undefined) payment.amount = money(data.amount);
		if (data.paymentDate !== undefined) payment.paymentDate = data.paymentDate;
		if (data.paidBy !== undefined) payment.paidBy = data.paidBy;
		if (data.touristName !== undefined) payment.touristName = data.touristName;
		if (data.bookingReference !== undefined) payment.bookingReference = data.bookingReference;
		if (data.remarks !== undefined) payment.remarks = data.remarks;
		payment.updatedBy = new Types.ObjectId(adminUserId);

		await payment.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'cash_payment.updated',
			targetType: 'CashPayment',
			targetId: payment._id.toString(),
			description: `Edited cash payment ${payment.cashPaymentCode ?? payment._id.toString()} (₹${before.amount} → ₹${payment.amount})`,
			metadata: { guideAccountId: payment.guide.toString(), before, after: { amount: payment.amount, paymentDate: payment.paymentDate } },
		});

		return payment;
	}

	/**
	 * Soft delete. The row stays in the database, flips to 'voided', and drops out
	 * of the guide's payment history — but stays visible to admins, which is the
	 * whole point of voiding rather than deleting.
	 */
	async void(params: {
		paymentId: string;
		reason?: string;
		adminUserId: string;
	}): Promise<ICashPayment> {
		const { paymentId, reason, adminUserId } = params;

		const payment = await CashPaymentDB.findById(paymentId);
		if (!payment) {
			throw new NotFoundError('Cash payment not found');
		}
		if (payment.status === 'voided') {
			throw new ConflictError('This payment has already been voided');
		}

		payment.status = 'voided';
		payment.deletedAt = new Date();
		payment.deletedBy = new Types.ObjectId(adminUserId);
		payment.voidReason = reason;
		await payment.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'cash_payment.voided',
			targetType: 'CashPayment',
			targetId: payment._id.toString(),
			description: `Voided cash payment ${payment.cashPaymentCode ?? payment._id.toString()} of ₹${payment.amount}${reason ? `: ${reason}` : ''}`,
			metadata: { guideAccountId: payment.guide.toString(), amount: payment.amount, reason },
		});

		return payment;
	}

	/** Admin view of one guide's cash records — voided rows included. */
	async getForGuide(guideAccountId: string, { page = 1, limit = 50 }: PageParams = {}) {
		await this.requireGuideAccount(guideAccountId);

		const skip = (page - 1) * limit;
		const query = { guide: new Types.ObjectId(guideAccountId) };

		const [data, total] = await Promise.all([
			CashPaymentDB.find(query)
				.populate('recordedBy', 'name email')
				.populate('createdBy', 'name email')
				.populate('updatedBy', 'name email')
				.populate('deletedBy', 'name email')
				.sort({ paymentDate: -1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			CashPaymentDB.countDocuments(query),
		]);

		return {
			data,
			total,
			page,
			totalPages: Math.ceil(total / limit) || 1,
			summary: await this.summaryFor(guideAccountId),
		};
	}

	/**
	 * The guide's own payment history. Voided records are excluded — from the
	 * guide's point of view a voided payment is one that was never really there.
	 * The audit trail lives on the admin side.
	 */
	async getMy(guideAccountId: string, { page = 1, limit = 50 }: PageParams = {}) {
		const skip = (page - 1) * limit;
		const query = { guide: new Types.ObjectId(guideAccountId), status: 'received' as const };

		const [data, total] = await Promise.all([
			CashPaymentDB.find(query)
				// Deliberately no populate of the admin who recorded it, and the
				// projection below drops every audit field: the guide sees the money,
				// not who inside the business touched the record.
				.select('cashPaymentCode amount paymentDate method paidBy touristName bookingReference remarks status createdAt')
				.sort({ paymentDate: -1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			CashPaymentDB.countDocuments(query),
		]);

		return {
			data,
			total,
			page,
			totalPages: Math.ceil(total / limit) || 1,
			summary: await this.summaryFor(guideAccountId),
		};
	}

	/** Totals over the live (non-voided) records only. */
	async summaryFor(guideAccountId: string) {
		const [row] = await CashPaymentDB.aggregate<{ totalAmount: number; count: number }>([
			{ $match: { guide: new Types.ObjectId(guideAccountId), status: 'received' } },
			{ $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
		]);

		return {
			totalAmount: money(row?.totalAmount ?? 0),
			count: row?.count ?? 0,
		};
	}

	/** Admin: every cash record across all guides. */
	async getAll(
		filters: { guideId?: string; status?: 'received' | 'voided' } = {},
		{ page = 1, limit = 20 }: PageParams = {}
	) {
		const query: Record<string, unknown> = {};
		if (filters.guideId) query.guide = new Types.ObjectId(filters.guideId);
		if (filters.status) query.status = filters.status;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			CashPaymentDB.find(query)
				.populate('guide', 'name email phone')
				.populate('recordedBy', 'name email')
				.sort({ paymentDate: -1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			CashPaymentDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}
}

export default new CashPaymentService();
