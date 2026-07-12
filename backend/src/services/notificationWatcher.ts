import { BookingDB, GuideDB, TransactionDB } from '@mongo';
import { error as logError, info } from 'node-be-utilities';
import BalancePaymentService from './balancePayment';
import EarningService from './earning';
import NotificationService from './notification';

const MEMBERSHIP_EXPIRY_REMINDER_BUCKETS = [7, 3, 1] as const;
const PAYMENT_SCAN_LOOKBACK_MULTIPLIER = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
/** Chase an unpaid balance once the trip is this close. */
const BALANCE_REMINDER_WINDOW_DAYS = 7;

/**
 * Read-only scan of Transaction for recently successful payments. Never
 * imports from services/payment.ts — this mirrors its reference_type
 * dispatch purely as a read, so protected payment code stays untouched.
 */
async function scanPaymentSuccesses(intervalMs: number) {
	const since = new Date(Date.now() - intervalMs * PAYMENT_SCAN_LOOKBACK_MULTIPLIER);

	const transactions = await TransactionDB.find({
		status: { $in: ['success', 'paid'] },
		updatedAt: { $gte: since },
	})
		.limit(200)
		.lean();

	for (const transaction of transactions) {
		try {
			if (transaction.reference_type === 'booking') {
				const booking = await BookingDB.findById(transaction.reference_id).select('linked_to').lean();
				if (!booking?.linked_to) continue;

				await NotificationService.create({
					recipient: booking.linked_to,
					type: 'payment_successful',
					title: 'Payment Successful',
					message: 'Your booking payment was received successfully.',
					relatedEntity: { kind: 'Transaction', id: transaction._id.toString() },
					dedupeKey: `payment_successful:${transaction._id.toString()}`,
				});
			} else if (transaction.reference_type === 'guide_membership') {
				const guide = await GuideDB.findById(transaction.reference_id).select('accountId').lean();
				if (!guide?.accountId) continue;

				await NotificationService.create({
					recipient: guide.accountId,
					type: 'payment_successful',
					title: 'Payment Successful',
					message: 'Your guide membership payment was received successfully.',
					relatedEntity: { kind: 'Transaction', id: transaction._id.toString() },
					dedupeKey: `payment_successful:${transaction._id.toString()}`,
				});
			}
			// 'enrollment' / 'pending_booking' / 'pending_enrollment' reference
			// types have no linked Account yet — nothing to notify in-app.
		} catch (err) {
			logError('notificationWatcher: failed processing transaction', err);
		}
	}
}

/**
 * Read-only scan of Guide for memberships expiring within 7 days. Never
 * imports from services/guide.ts — pure GuideDB reads.
 */
async function scanMembershipExpiring() {
	const now = Date.now();

	const guides = await GuideDB.find({
		isVisible: true,
		membershipExpiryDate: { $gte: new Date(now), $lte: new Date(now + 7 * ONE_DAY_MS) },
	})
		.select('accountId membershipExpiryDate')
		.lean();

	for (const guide of guides) {
		try {
			if (!guide.membershipExpiryDate) continue;

			const daysRemaining = Math.ceil((new Date(guide.membershipExpiryDate).getTime() - now) / ONE_DAY_MS);
			const bucket = MEMBERSHIP_EXPIRY_REMINDER_BUCKETS.find((b) => daysRemaining <= b);
			if (!bucket) continue;

			await NotificationService.create({
				recipient: guide.accountId,
				type: 'membership_expiring',
				title: 'Membership Expiring Soon',
				message: `Your guide membership expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Renew to stay visible to travelers.`,
				relatedEntity: { kind: 'Guide', id: guide._id.toString() },
				dedupeKey: `membership_expiring:${guide._id.toString()}:${bucket}`,
			});
		} catch (err) {
			logError('notificationWatcher: failed processing guide membership expiry', err);
		}
	}
}

/**
 * Move earnings past their hold window from 'pending' to 'payable', so they show
 * up in the admin payout queue. Idempotent, hence safe on every tick.
 */
async function promoteMaturedEarnings() {
	const promoted = await EarningService.promoteMaturedEarnings();
	if (promoted > 0) {
		info(`notificationWatcher: ${promoted} earning(s) became payable`);
	}
}

/** Nudge tourists whose trip is close but whose balance is still outstanding. */
async function remindOutstandingBalances() {
	await BalancePaymentService.remindOutstandingBalances(BALANCE_REMINDER_WINDOW_DAYS);
}

/**
 * Background poller for notification types whose source events live inside
 * protected modules (payment success, membership expiry) this codebase must
 * not modify. Dedup is enforced entirely by Notification's unique
 * `dedupeKey` index, so repeated ticks over the same data are harmless.
 *
 * It also drives the two pieces of ledger bookkeeping that are time-based rather
 * than event-based: maturing earnings, and chasing unpaid balances.
 */
export function startNotificationWatcher(
	intervalMs = Number(process.env.NOTIFICATION_WATCHER_INTERVAL_MS) || 5 * 60_000
) {
	const tick = async () => {
		try {
			await scanPaymentSuccesses(intervalMs);
			await scanMembershipExpiring();
			await promoteMaturedEarnings();
			await remindOutstandingBalances();
		} catch (err) {
			logError('notificationWatcher: tick failed', err);
		}
	};

	info(`Notification watcher started (interval ${intervalMs}ms)`);
	tick();
	return setInterval(tick, intervalMs);
}
