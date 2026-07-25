import { RAZORPAY_WEBHOOK_SECRET } from '@config/const';
import { AccountDB, GuideDB, TransactionDB } from '@mongo';
import WebhookEventDB from '@mongo/repo/WebhookEvent';
import type ITransaction from '@mongo/types/transaction';
import type { ITransactionFailure } from '@mongo/types/transaction';
import RazorpayProvider from '@provider/razorpay';
import BalancePaymentService from '@services/balancePayment';
import BookingService from '@services/booking';
import GuideService from '@services/guide';
import TourGuideService from '@services/tourguide';
import { timingSafeCompare } from '@utils/paymentVerify';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { error as logError, info } from 'node-be-utilities';

const MAX_RETRIES = 3;

/**
 * A payment is "unsuccessful" if the gateway declined it, or if it cleared but
 * our own follow-up bookkeeping never completed. Both need a human to look, so
 * the admin view treats them as one list.
 */
const UNSUCCESSFUL_STATUSES = ['failed', 'pending_verification'] as const;

/**
 * Pull Razorpay's failure fields off a payment entity.
 *
 * Every field is optional on their side, so this returns `undefined` rather than
 * an empty husk when the payload carries no diagnosis at all — an absent
 * `failure` then honestly means "we were told nothing".
 */
function toFailureRecord(paymentEntity: any): ITransactionFailure | undefined {
	const record: ITransactionFailure = {
		code: paymentEntity?.error_code ?? undefined,
		description: paymentEntity?.error_description ?? undefined,
		source: paymentEntity?.error_source ?? undefined,
		step: paymentEntity?.error_step ?? undefined,
		reason: paymentEntity?.error_reason ?? undefined,
		method: paymentEntity?.method ?? undefined,
		// Razorpay timestamps are unix seconds.
		at: paymentEntity?.created_at ? new Date(paymentEntity.created_at * 1000) : new Date(),
	};

	const hasDiagnosis = Boolean(
		record.code || record.description || record.source || record.step || record.reason
	);

	return hasDiagnosis ? record : undefined;
}

class PaymentService {
	/**
	 * Verify Razorpay webhook signature using raw body.
	 */
	verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
		const expectedSignature = crypto
			.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
			.update(rawBody)
			.digest('hex');

		return timingSafeCompare(expectedSignature, signature);
	}

	/**
	 * Process a Razorpay webhook event.
	 * Handles deduplication, payment.captured, and payment.failed.
	 *
	 * `eventId` comes from the `x-razorpay-event-id` REQUEST HEADER, not the body.
	 * Razorpay's webhook payload carries no event identifier of its own, so
	 * deriving it from the body (as this used to) always yielded `undefined` —
	 * which Mongoose strips from a query, turning the dedup lookup into a
	 * match-anything `findOne({})` and making the subsequent insert fail the
	 * `required` validator on every single delivery.
	 */
	async handleWebhookEvent(payload: any, eventId: string): Promise<{ message: string }> {
		const eventType: string = payload.event;
		const paymentEntity = payload.payload?.payment?.entity;

		if (!paymentEntity) {
			return { message: 'No payment entity in payload — skipped' };
		}

		const paymentId: string = paymentEntity.id;
		const orderId: string = paymentEntity.order_id;

		// Step 1: Claim the event BEFORE doing any work. Razorpay retries
		// aggressively and can have two deliveries of the same event in flight at
		// once; a check-then-insert leaves a window where both pass the check and
		// both process. The unique index on `eventId` makes this claim atomic, so
		// exactly one delivery proceeds and the loser exits as a duplicate.
		try {
			await WebhookEventDB.create({
				eventId,
				eventType,
				paymentId,
				orderId,
				status: 'processed',
				processedAt: new Date(),
			});
		} catch (err: any) {
			if (err?.code === 11000) {
				info('Webhook: Duplicate event skipped', { eventId, eventType });
				return { message: 'Event already processed' };
			}
			throw err;
		}

		// Step 2: Route to handler
		let status: 'processed' | 'failed' = 'processed';

		try {
			switch (eventType) {
				case 'payment.captured':
					await this.handlePaymentCaptured(orderId, paymentId);
					break;

				case 'payment.failed':
					await this.handlePaymentFailed(orderId, paymentId, paymentEntity);
					break;

				default:
					info('Webhook: Unhandled event type', { eventType, eventId });
					return { message: `Event type ${eventType} not handled` };
			}
		} catch (err) {
			status = 'failed';
			logError('Webhook: Event processing failed', { eventId, eventType, error: err });
		}

		// Step 3: Record the outcome against the claim made in step 1. Best-effort:
		// the claim itself is what guarantees single processing, so a failure to
		// annotate it must not turn a handled event into a 500 and another retry.
		if (status === 'failed') {
			await WebhookEventDB.updateOne({ eventId }, { status }).catch(() => {});
		}

		return { message: `Event ${eventType} ${status}` };
	}

	/**
	 * Handle payment.captured — mark transaction as SUCCESS and update registration.
	 */
	private async handlePaymentCaptured(orderId: string, paymentId: string): Promise<void> {
		const transaction = await TransactionDB.findOne({ razorpay_order_id: orderId });

		if (!transaction) {
			logError('Webhook: Transaction not found for order', { orderId });
			return;
		}

		// Check for duplicate payment on same order
		if (transaction.status === 'success' || transaction.status === 'paid') {
			if (transaction.razorpay_payment_id && transaction.razorpay_payment_id !== paymentId) {
				// Different payment for same order — trigger refund
				await this.refundDuplicatePayment(paymentId, transaction.amount, orderId);
				return;
			}

			info('Webhook: Transaction already marked success', {
				transactionId: transaction.transaction_id,
			});
			return;
		}

		// Update transaction
		transaction.razorpay_payment_id = paymentId;
		transaction.status = 'success';
		await transaction.save();

		// Finalise whatever this payment was for — a booking, a membership, etc.
		await this.fulfillCapturedPayment(transaction, paymentId);
	}

	/**
	 * Route a freshly-captured payment to the code that finalises it.
	 *
	 * Booking orders are turned into a Booking HERE — on the webhook, server-side
	 * — so a captured payment always yields a booking even if the browser never
	 * returns to verify. The domain services do the heavy lifting; this only
	 * routes by reference_type, keeping the webhook path thin. Every fulfilment is
	 * idempotent (guarded by Booking's unique transaction_id), so it is safe to
	 * run alongside a concurrent browser verify.
	 */
	private async fulfillCapturedPayment(
		transaction: ITransaction,
		paymentId: string
	): Promise<void> {
		const refType = transaction.reference_type;
		const meta = transaction.metadata;

		try {
			switch (refType) {
				case 'pending_booking':
					if (!meta) return this.logUnfulfillable(transaction);
					await BookingService.fulfillCustomisedBooking(transaction, meta as never, { paymentId });
					return;

				case 'pending_package_booking':
					if (!meta) return this.logUnfulfillable(transaction);
					await BookingService.fulfillPackageBooking(transaction, meta as never, { paymentId });
					return;

				case 'pending_direct_booking':
					if (!meta) return this.logUnfulfillable(transaction);
					await TourGuideService.fulfillDirectBooking(transaction, meta as never, { paymentId });
					return;

				case 'booking_balance':
					await BalancePaymentService.settleFromWebhook(transaction, paymentId);
					return;
			}
		} catch (err) {
			// Leave the transaction 'success' with no booking; the notification
			// watcher's reconciliation sweep retries these from the snapshot, so a
			// transient failure here self-heals rather than losing the booking.
			logError('Webhook: booking fulfilment from captured payment failed', {
				orderId: transaction.razorpay_order_id,
				referenceType: refType,
				error: err,
			});
			return;
		}

		// Everything else — guide membership, and the legacy account-tourist path.
		await this.updateRegistrationStatus(transaction, 'completed');
	}

	/**
	 * A booking order opened before its terms were snapshotted server-side. The
	 * client still carries the terms and completes the booking on verify, so
	 * there is nothing this side can reconstruct — only the browser path can.
	 */
	private logUnfulfillable(transaction: ITransaction): void {
		info('Webhook: captured booking payment has no server-side terms to fulfil', {
			transactionId: transaction.transaction_id,
			referenceType: transaction.reference_type,
		});
	}

	/**
	 * Handle payment.failed — mark transaction as FAILED and record Razorpay's
	 * stated reason.
	 */
	private async handlePaymentFailed(
		orderId: string,
		paymentId: string,
		paymentEntity: any
	): Promise<void> {
		const transaction = await TransactionDB.findOne({ razorpay_order_id: orderId });

		if (!transaction) {
			logError('Webhook: Transaction not found for order', { orderId });
			return;
		}

		// Don't override a successful transaction
		if (transaction.status === 'success' || transaction.status === 'paid') {
			return;
		}

		transaction.razorpay_payment_id = paymentId;
		transaction.status = 'failed';
		transaction.failure = toFailureRecord(paymentEntity);
		await transaction.save();

		info('Webhook: Payment failed', {
			orderId,
			paymentId,
			referenceType: transaction.reference_type,
			code: transaction.failure?.code,
			description: transaction.failure?.description,
		});

		// Update registration status
		await this.updateRegistrationStatus(transaction, 'failed');
	}

	/**
	 * Update the registration record (Guide membership or Account) with retry.
	 * If all retries fail, marks transaction as PENDING_VERIFICATION.
	 *
	 * Takes the transaction itself rather than its fields: `reference_id` is not
	 * unique (a guide has one per renewal), so the exhaustion path below has to
	 * be able to stamp *this* row and no other.
	 */
	private async updateRegistrationStatus(
		transaction: ITransaction,
		status: 'completed' | 'failed'
	): Promise<void> {
		const { reference_id: referenceId, type, reference_type: referenceType } = transaction;

		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				if (referenceType === 'guide_membership') {
					// Recurring guide membership payment — reference_id is a Guide
					// document id.
					await GuideService.finalizeMembershipPaymentByGuideId(
						referenceId,
						status === 'completed' ? 'success' : 'failed'
					);
				} else if (type === 'tourist') {
					// Booking orders never reference an Account. A pending_* order
					// carries a throwaway token (see BookingService.createBooking)
					// and a settled one carries a Booking id, so the old
					// findByIdAndUpdate(referenceId) either threw a CastError —
					// burning all three retries and mis-stamping the transaction —
					// or silently updated nothing. Resolve the account first and
					// skip when there isn't one; the transaction's own status is
					// the record of the payment either way.
					//
					// (The old `|| type === 'booking'` arm went with it —
					// TransactionType is 'guide' | 'tourist', so it never matched.)
					const account = Types.ObjectId.isValid(referenceId)
						? await AccountDB.findById(referenceId).select('_id')
						: null;

					if (!account) {
						info('Payment: Reference is not an account — transaction status is the record', {
							referenceId,
							type,
							referenceType,
							status,
						});
						return;
					}

					await AccountDB.findByIdAndUpdate(account._id, {
						paymentStatus: status === 'completed' ? 'success' : 'failed',
					});
				}

				info('Payment: Registration status updated', {
					referenceId,
					type,
					referenceType,
					status,
					attempt,
				});
				return;
			} catch (err) {
				logError('Payment: Failed to update registration status', {
					referenceId,
					type,
					status,
					attempt,
					error: err,
				});

				if (attempt === MAX_RETRIES) {
					// All retries exhausted. A payment the gateway already told us
					// failed stays 'failed' — that verdict is not in doubt, only our
					// own bookkeeping is, and downgrading it to pending_verification
					// would hide a real failure behind a "check this" flag.
					if (status !== 'failed') {
						await TransactionDB.updateOne(
							{ _id: transaction._id },
							{ status: 'pending_verification' }
						);
					}

					logError('Payment: Registration update abandoned after max retries', {
						referenceId,
						type,
						transactionId: transaction.transaction_id,
						markedPendingVerification: status !== 'failed',
					});
				}
			}
		}
	}

	/**
	 * Refund a duplicate payment.
	 */
	private async refundDuplicatePayment(
		paymentId: string,
		amount: number,
		orderId: string
	): Promise<void> {
		try {
			const refund = await RazorpayProvider.refunds.createRefund({
				payment_id: paymentId,
				amount,
				reference_id: orderId,
				data: { reason: 'duplicate_payment' },
			});

			info('Payment: Duplicate payment refunded', {
				paymentId,
				refundId: refund.id,
				amount,
				orderId,
			});
		} catch (err) {
			logError('Payment: Failed to refund duplicate payment', {
				paymentId,
				amount,
				orderId,
				error: err,
			});
		}
	}

	/**
	 * Admin view of money that never landed.
	 *
	 * The Payments screen lists invoices, which by construction only exist for
	 * payments that succeeded — so until now a declined card was invisible to
	 * anyone but whoever read the logs. This lists the other side: declined
	 * payments and ones whose post-payment bookkeeping was abandoned.
	 */
	async listFailedPayments(
		filters: {
			status?: (typeof UNSUCCESSFUL_STATUSES)[number];
			referenceType?: string;
			account?: Types.ObjectId | string;
			search?: string;
			from?: string;
			to?: string;
		} = {},
		{ page = 1, limit = 20 }: { page?: number; limit?: number } = {}
	) {
		const query: Record<string, unknown> = {
			status: filters.status ?? { $in: [...UNSUCCESSFUL_STATUSES] },
		};

		if (filters.account) {
			query.account = filters.account;
		}

		if (filters.referenceType) {
			query.reference_type = filters.referenceType;
		}

		if (filters.from || filters.to) {
			query.createdAt = {
				...(filters.from ? { $gte: new Date(filters.from) } : {}),
				...(filters.to ? { $lte: new Date(filters.to) } : {}),
			};
		}

		if (filters.search) {
			const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const like = { $regex: escaped, $options: 'i' };
			query.$or = [
				{ 'customer.name': like },
				{ 'customer.email': like },
				{ 'customer.phone': like },
				{ paymentCode: like },
				{ razorpay_order_id: like },
				{ razorpay_payment_id: like },
				{ transaction_id: like },
			];
		}

		const skip = (page - 1) * limit;
		const [rows, total] = await Promise.all([
			TransactionDB.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			TransactionDB.countDocuments(query),
		]);

		const customerByTxnId = await this.resolveCustomers(rows);

		return {
			data: rows.map((t) => ({
				_id: t._id.toString(),
				paymentCode: t.paymentCode ?? null,
				transaction_id: t.transaction_id,
				razorpay_order_id: t.razorpay_order_id,
				razorpay_payment_id: t.razorpay_payment_id ?? null,
				referenceType: t.reference_type,
				type: t.type,
				status: t.status,
				amount: t.amount,
				currency: t.currency,
				customer: customerByTxnId.get(t._id.toString()) ?? null,
				failure: t.failure ?? null,
				attemptedAt: t.createdAt,
				updatedAt: t.updatedAt,
			})),
			total,
			page,
			totalPages: Math.ceil(total / limit) || 1,
		};
	}

	/**
	 * One person's own unsuccessful payments, for their dashboard.
	 *
	 * Deliberately narrower than the admin list: no customer block (they know who
	 * they are) and no gateway order ids, but it does carry `bookingId` where one
	 * exists so the dashboard can link straight to the thing that needs paying
	 * for again.
	 *
	 * Guest bookings have no account and so appear nowhere here — there is no
	 * dashboard to show them on.
	 */
	async listMyFailedPayments(
		accountId: Types.ObjectId | string,
		{ limit = 10 }: { limit?: number } = {}
	) {
		const rows = await TransactionDB.find({
			account: accountId,
			status: { $in: [...UNSUCCESSFUL_STATUSES] },
		})
			.sort({ createdAt: -1 })
			.limit(limit)
			.lean();

		return rows.map((t) => ({
			_id: t._id.toString(),
			paymentCode: t.paymentCode ?? null,
			referenceType: t.reference_type,
			status: t.status,
			amount: t.amount,
			currency: t.currency,
			// Present only once a booking exists — a checkout abandoned before
			// payment never wrote one, so there is nothing to link to.
			bookingId:
				(t.reference_type === 'booking' || t.reference_type === 'booking_balance') &&
				Types.ObjectId.isValid(t.reference_id)
					? t.reference_id
					: null,
			failure: t.failure ?? null,
			attemptedAt: t.createdAt,
		}));
	}

	/**
	 * Best-effort "who was this?" for a page of transactions.
	 *
	 * New rows carry their own customer snapshot. Older ones don't, but a
	 * membership payment still points at a Guide, and a Guide at an Account — so
	 * historical failures stay identifiable instead of showing as a blank row.
	 */
	private async resolveCustomers(
		rows: Array<Pick<ITransaction, '_id' | 'customer' | 'reference_id' | 'reference_type'>>
	): Promise<Map<string, { name?: string; email?: string; phone?: string }>> {
		const resolved = new Map<string, { name?: string; email?: string; phone?: string }>();

		const needsLookup: typeof rows = [];
		for (const row of rows) {
			if (row.customer?.email || row.customer?.name) {
				resolved.set(row._id.toString(), row.customer);
			} else if (
				row.reference_type === 'guide_membership' &&
				Types.ObjectId.isValid(row.reference_id)
			) {
				needsLookup.push(row);
			}
		}

		if (needsLookup.length === 0) {
			return resolved;
		}

		const guides = await GuideDB.find({ _id: { $in: needsLookup.map((r) => r.reference_id) } })
			.select('accountId')
			.lean();
		const accountIdByGuideId = new Map(guides.map((g) => [g._id.toString(), g.accountId]));

		const accounts = await AccountDB.find({ _id: { $in: [...accountIdByGuideId.values()] } })
			.select('name email phone')
			.lean();
		const accountById = new Map(accounts.map((a) => [a._id.toString(), a]));

		for (const row of needsLookup) {
			const accountId = accountIdByGuideId.get(row.reference_id);
			const account = accountId ? accountById.get(accountId.toString()) : undefined;
			if (account) {
				resolved.set(row._id.toString(), {
					name: account.name,
					email: account.email,
					phone: account.phone,
				});
			}
		}

		return resolved;
	}
}

export default new PaymentService();
