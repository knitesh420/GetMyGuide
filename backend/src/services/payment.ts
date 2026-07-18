import { RAZORPAY_WEBHOOK_SECRET } from '@config/const';
import { AccountDB, TransactionDB } from '@mongo';
import WebhookEventDB from '@mongo/repo/WebhookEvent';
import RazorpayProvider from '@provider/razorpay';
import GuideService from '@services/guide';
import { timingSafeCompare } from '@utils/paymentVerify';
import crypto from 'crypto';
import { error as logError, info } from 'node-be-utilities';

const MAX_RETRIES = 3;

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
					await this.handlePaymentFailed(orderId, paymentId);
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

		// Update registration status with retry
		await this.updateRegistrationStatus(
			transaction.reference_id,
			transaction.type,
			transaction.reference_type,
			'completed'
		);
	}

	/**
	 * Handle payment.failed — mark transaction as FAILED.
	 */
	private async handlePaymentFailed(orderId: string, paymentId: string): Promise<void> {
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
		await transaction.save();

		// Update registration status
		await this.updateRegistrationStatus(
			transaction.reference_id,
			transaction.type,
			transaction.reference_type,
			'failed'
		);
	}

	/**
	 * Update the registration record (Guide membership or Account) with retry.
	 * If all retries fail, marks transaction as PENDING_VERIFICATION.
	 */
	private async updateRegistrationStatus(
		referenceId: string,
		type: string,
		referenceType: string,
		status: 'completed' | 'failed'
	): Promise<void> {
		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				if (referenceType === 'guide_membership') {
					// Recurring guide membership payment — reference_id is a Guide
					// document id.
					await GuideService.finalizeMembershipPaymentByGuideId(
						referenceId,
						status === 'completed' ? 'success' : 'failed'
					);
				} else if (type === 'tourist' || type === 'booking') {
					const accountStatus = status === 'completed' ? 'success' : 'failed';
					await AccountDB.findByIdAndUpdate(referenceId, {
						paymentStatus: accountStatus,
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
					// All retries exhausted — mark transaction for manual review
					await TransactionDB.findOneAndUpdate(
						{ reference_id: referenceId },
						{ status: 'pending_verification' }
					);

					logError('Payment: Marked as PENDING_VERIFICATION after max retries', {
						referenceId,
						type,
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
}

export default new PaymentService();
