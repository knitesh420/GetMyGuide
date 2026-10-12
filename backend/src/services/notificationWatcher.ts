import { AccountDB, BookingDB, GuideDB, TransactionDB } from '@mongo';
import { GUIDE_MEMBERSHIP_FEE, GUIDE_MEMBERSHIP_TRIAL_DAYS } from '@config/const';
import { COMPANY_WEBSITE } from '@config/company';
import { sendGuideMembershipReminderEmail } from '@provider/email';
import { error as logError, info } from 'node-be-utilities';
import {
	activeMembershipFilter,
	dueMembershipReminderDays,
} from '@utils/guideMembership';
import BalancePaymentService from './balancePayment';
import BookingService from './booking';
import EarningService from './earning';
import GuideService from './guide';
import NotificationService from './notification';
import TourGuideService from './tourguide';

/** Booking orders whose payment has cleared but that have not become a Booking. */
const PENDING_BOOKING_REFERENCE_TYPES = [
	'pending_booking',
	'pending_package_booking',
	'pending_direct_booking',
] as const;

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
 * Backstop for the payment-fulfilment gap. A captured booking payment normally
 * becomes a Booking on the webhook; this catches the residue — deliveries where
 * that fulfilment threw transiently, or (before the webhook did this) payments
 * that were only ever going to be fulfilled by a browser that never came back.
 *
 * It reconstructs the booking from the terms snapshotted on the transaction and
 * calls the same idempotent fulfil methods the webhook uses, so re-running it is
 * always safe: once a booking exists, the transaction's reference_type is no
 * longer 'pending_*' and it drops out of this scan.
 */
async function reconcileOrphanedBookingPayments() {
	const orphans = await TransactionDB.find({
		reference_type: { $in: [...PENDING_BOOKING_REFERENCE_TYPES] },
		status: { $in: ['success', 'paid'] },
		metadata: { $exists: true, $ne: null },
	})
		.limit(100)
		.exec();

	for (const transaction of orphans) {
		try {
			const already = await BookingDB.findOne({ transaction_id: transaction.transaction_id })
				.select('_id')
				.lean();
			if (already) continue;

			const paymentId = transaction.razorpay_payment_id;
			const meta = transaction.metadata as never;

			if (transaction.reference_type === 'pending_booking') {
				await BookingService.fulfillCustomisedBooking(transaction, meta, { paymentId });
			} else if (transaction.reference_type === 'pending_package_booking') {
				await BookingService.fulfillPackageBooking(transaction, meta, { paymentId });
			} else if (transaction.reference_type === 'pending_direct_booking') {
				await TourGuideService.fulfillDirectBooking(transaction, meta, { paymentId });
			}

			info('notificationWatcher: reconciled an orphaned booking payment', {
				transactionId: transaction.transaction_id,
				referenceType: transaction.reference_type,
			});
		} catch (err) {
			logError('notificationWatcher: could not reconcile orphaned booking payment', {
				transactionId: transaction.transaction_id,
				error: err,
			});
		}
	}
}

/**
 * Read-only scan of Guide for memberships expiring within 5 days, with a
 * five-day retry window after expiry. Never
 * imports from services/guide.ts — pure GuideDB reads.
 */
async function scanMembershipExpiring() {
	const now = Date.now();
	const renewalUrl = new URL('/dashboard/guide/buy-subscription', COMPANY_WEBSITE).toString();

	const guides = await GuideDB.find({
		isVisible: true,
		...activeMembershipFilter(new Date(now - 5 * ONE_DAY_MS)),
		membershipExpiryDate: {
			$gte: new Date(now - 5 * ONE_DAY_MS),
			$lte: new Date(now + 5 * ONE_DAY_MS),
		},
	})
		.select('accountId membershipExpiryDate membershipPlan')
		.lean();

	const accounts = await AccountDB.find({
		_id: { $in: guides.map((guide) => guide.accountId) },
		role: 'guide',
		isActive: true,
	})
		.select('name email')
		.lean();
	const accountById = new Map(accounts.map((account) => [account._id.toString(), account]));

	for (const guide of guides) {
		try {
			if (!guide.membershipExpiryDate) continue;
			const account = accountById.get(guide.accountId.toString());
			if (!account) continue;

			const expiry = new Date(guide.membershipExpiryDate);
			const expiryLabel = expiry.toLocaleString('en-IN', {
				timeZone: 'Asia/Kolkata',
				dateStyle: 'long',
				timeStyle: 'short',
			});
			const periodLabel =
				guide.membershipPlan === 'trial'
					? `${GUIDE_MEMBERSHIP_TRIAL_DAYS}-day free trial`
					: 'guide membership';
			const expiryKey = expiry.getTime();
			for (const reminderDay of dueMembershipReminderDays(expiry, new Date(now))) {
				const notification = await NotificationService.getOrCreateMembershipReminder({
					recipient: guide.accountId,
					type: 'membership_expiring',
					title: reminderDay === 0 ? 'Your Membership Expires Today' : 'Membership Renewal Reminder',
					message: `Your ${periodLabel} expires on ${expiryLabel}. Renew for ₹${GUIDE_MEMBERSHIP_FEE} to remain eligible for public listings and new bookings: ${renewalUrl}`,
					relatedEntity: { kind: 'Guide', id: guide._id.toString() },
					dedupeKey: `membership_expiring:${guide._id.toString()}:${expiryKey}:${reminderDay}`,
				});
				if (!notification) continue;

				if (account.email && process.env.RESEND_API_KEY) {
					await NotificationService.deliverEmailOnce(notification._id, () =>
						sendGuideMembershipReminderEmail(
							account.email,
							{ name: account.name, expiryDate: expiryLabel, renewalUrl },
							`guide-membership-expiry:${notification._id.toString()}`
						)
					);
				}
			}
		} catch (err) {
			logError('notificationWatcher: failed processing guide membership expiry', err);
		}
	}
}

/** Apply successful memberships whose webhook/browser finalizer did not finish. */
async function reconcileUnappliedMembershipPayments() {
	const transactions = await TransactionDB.find({
		reference_type: 'guide_membership',
		status: { $in: ['success', 'paid', 'pending_verification'] },
		amount: GUIDE_MEMBERSHIP_FEE,
		currency: 'INR',
		membershipAppliedAt: null,
		updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
	})
		.sort({ updatedAt: 1 })
		.limit(100)
		.lean();

	for (const transaction of transactions) {
		try {
			if (transaction.status === 'pending_verification') {
				await TransactionDB.updateOne(
					{ _id: transaction._id, status: 'pending_verification' },
					{ $set: { status: 'success' } }
				);
			}
			await GuideService.finalizeMembershipPaymentByGuideId(transaction.reference_id, 'success', {
				transactionId: transaction._id.toString(),
			});
		} catch (err) {
			logError('notificationWatcher: could not reconcile guide membership payment', {
				transactionId: transaction.transaction_id,
				error: err,
			});
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
			await reconcileOrphanedBookingPayments();
			await reconcileUnappliedMembershipPayments();
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
