import { AccountDB, GuideDB, TransactionDB } from '@mongo';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

// Razorpay is the only thing in this flow that reaches the outside world. Mocked
// at the transaction-service boundary so what is under test is the *decision* to
// refund, not the HTTP client.
jest.mock('@services/transaction', () => ({
	__esModule: true,
	default: {
		refundPayment: jest.fn(),
		createTransaction: jest.fn(),
		getTransaction: jest.fn(),
		getTransactionByReference: jest.fn(),
	},
}));

// The invoice generator emails a PDF; irrelevant here, and it would otherwise
// reach for a mail provider.
jest.mock('@services/invoice', () => ({
	__esModule: true,
	default: { createMembershipInvoice: jest.fn() },
}));

import TransactionService from '@services/transaction';
import GuideService from '@services/guide';

const mockRefundPayment = TransactionService.refundPayment as jest.Mock;

const DAY = 24 * 60 * 60 * 1000;
const MEMBERSHIP_DAYS = 30;

let adminId: string;

async function createAdmin() {
	const admin = await AccountDB.create({
		name: 'Admin',
		email: 'admin@example.com',
		phone: '+1234567899',
		password: 'Password@123',
		role: 'admin',
		status: 'verified',
	});
	return admin._id.toString();
}

/** A guide who has registered (KYC submitted) but has not paid or been reviewed. */
async function createRegisteredGuide(email = 'guide@example.com') {
	const account = await AccountDB.create({
		name: 'Test Guide',
		email,
		phone: '+1234567890',
		password: 'Password@123',
		role: 'guide',
		status: 'verified',
	});

	const guide = await GuideDB.create({
		accountId: account._id,
		languages: ['English'],
		city: 'Delhi',
		type: 'normal',
		profileImage: 'photo.jpg',
		identityProofs: ['licence.pdf', 'aadhar.pdf'],
		registrationCompleted: true,
		paymentStatus: 'pending',
		isVisible: false,
		approvalStatus: 'pending',
	});

	return { account, guide };
}

/** The membership fee transaction that the auto-refund looks for. */
async function createPaidMembershipTransaction(guideId: string, amount = 500) {
	return TransactionDB.create({
		reference_id: guideId,
		reference_type: 'guide_membership',
		type: 'guide',
		razorpay_order_id: 'order_test_1',
		razorpay_customer_id: 'cust_test_1',
		razorpay_payment_id: 'pay_test_1',
		transaction_id: 'txn_test_1',
		status: 'success',
		amount,
		currency: 'INR',
	});
}

describe('Guide membership: approval-gated subscription start', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();
		mockRefundPayment.mockReset();
		adminId = await createAdmin();
	});

	describe('finalizeMembershipPaymentByGuideId', () => {
		it('does NOT start the 30-day clock when the guide is not yet approved', async () => {
			const { guide } = await createRegisteredGuide();

			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.paymentStatus).toBe('success');
			// The whole point: paid, but no subscription window and not listed.
			expect(updated!.membershipPendingActivation).toBe(true);
			expect(updated!.membershipExpiryDate).toBeNull();
			expect(updated!.membershipStartDate).toBeNull();
			expect(updated!.isVisible).toBe(false);
			expect(updated!.membershipPaidAt).toBeInstanceOf(Date);
		});

		it('starts the clock immediately for an already-approved guide (the renewal case)', async () => {
			const { guide } = await createRegisteredGuide();
			await GuideDB.updateOne({ _id: guide._id }, { $set: { approvalStatus: 'approved' } });

			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.membershipPendingActivation).toBe(false);
			expect(updated!.isVisible).toBe(true);
			expect(updated!.membershipExpiryDate).toBeInstanceOf(Date);
			const days = Math.round(
				(updated!.membershipExpiryDate!.getTime() - Date.now()) / DAY
			);
			expect(days).toBe(MEMBERSHIP_DAYS);
		});

		it('extends a live membership from its existing expiry, not from today', async () => {
			const { guide } = await createRegisteredGuide();
			const existingExpiry = new Date(Date.now() + 10 * DAY);
			await GuideDB.updateOne(
				{ _id: guide._id },
				{
					$set: {
						approvalStatus: 'approved',
						isVisible: true,
						membershipStartDate: new Date(),
						membershipExpiryDate: existingExpiry,
					},
				}
			);

			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			const updated = await GuideDB.findById(guide._id);
			// Renewing early must not throw away the 10 days already paid for.
			const days = Math.round(
				(updated!.membershipExpiryDate!.getTime() - existingExpiry.getTime()) / DAY
			);
			expect(days).toBe(MEMBERSHIP_DAYS);
		});

		it('marks the payment failed without touching membership state', async () => {
			const { guide } = await createRegisteredGuide();

			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'failed');

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.paymentStatus).toBe('failed');
			expect(updated!.membershipExpiryDate).toBeNull();
			expect(updated!.isVisible).toBe(false);
		});
	});

	describe('approveGuide', () => {
		it('starts the 30-day subscription from the approval instant, not the payment date', async () => {
			const { account, guide } = await createRegisteredGuide();
			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			const approvedAtLowerBound = Date.now();
			await GuideService.approveGuide(account._id.toString(), adminId);

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.approvalStatus).toBe('approved');
			expect(updated!.membershipPendingActivation).toBe(false);
			expect(updated!.isVisible).toBe(true);

			// The window opens now — the time the guide spent in the review queue
			// costs them nothing.
			expect(updated!.membershipStartDate!.getTime()).toBeGreaterThanOrEqual(
				approvedAtLowerBound - 1000
			);
			const days = Math.round(
				(updated!.membershipExpiryDate!.getTime() - updated!.membershipStartDate!.getTime()) / DAY
			);
			expect(days).toBe(MEMBERSHIP_DAYS);

			// And exactly one membership period is on record for the one fee paid.
			expect(updated!.membershipHistory).toHaveLength(1);
		});

		it('approves an unpaid guide without listing them', async () => {
			const { account, guide } = await createRegisteredGuide();

			await GuideService.approveGuide(account._id.toString(), adminId);

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.approvalStatus).toBe('approved');
			expect(updated!.isVisible).toBe(false);
			expect(updated!.membershipExpiryDate).toBeNull();
		});

		it('leaves a legacy guide with a live window listed, without restarting their clock', async () => {
			// A guide who paid under the old start-at-payment rule: they have a
			// window running and no membershipPendingActivation flag at all.
			const { account, guide } = await createRegisteredGuide();
			const expiry = new Date(Date.now() + 20 * DAY);
			await GuideDB.updateOne(
				{ _id: guide._id },
				{
					$set: {
						paymentStatus: 'success',
						membershipStartDate: new Date(Date.now() - 10 * DAY),
						membershipExpiryDate: expiry,
					},
				}
			);

			await GuideService.approveGuide(account._id.toString(), adminId);

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.isVisible).toBe(true);
			// Untouched — not extended, not restarted.
			expect(updated!.membershipExpiryDate!.getTime()).toBe(expiry.getTime());
			expect(updated!.membershipHistory ?? []).toHaveLength(0);
		});
	});

	describe('rejectGuide: automatic refund', () => {
		it('refunds a membership that was paid for but never started', async () => {
			const { account, guide } = await createRegisteredGuide();
			await createPaidMembershipTransaction(guide._id.toString(), 500);
			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			mockRefundPayment.mockResolvedValue({ id: 'rfnd_test_1', amount: 500, status: 'processed' });

			await GuideService.rejectGuide(account._id.toString(), 'Licence is unreadable', adminId);

			expect(mockRefundPayment).toHaveBeenCalledTimes(1);
			expect(mockRefundPayment).toHaveBeenCalledWith(
				'pay_test_1',
				500,
				expect.any(String),
				'guide_application_rejected'
			);

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.approvalStatus).toBe('rejected');
			expect(updated!.isVisible).toBe(false);
			expect(updated!.membershipRefund?.status).toBe('processed');
			expect(updated!.membershipRefund?.refundId).toBe('rfnd_test_1');
			expect(updated!.membershipRefund?.amount).toBe(500);
			expect(updated!.membershipRefund?.refundedAt).toBeInstanceOf(Date);
			// The money is back, so the guide no longer holds a paid membership.
			expect(updated!.membershipPendingActivation).toBe(false);
			expect(updated!.paymentStatus).toBe('pending');
		});

		it('does NOT refund a guide who was approved and went live', async () => {
			// They consumed part of what they paid for; clawing it back in full is a
			// judgement call, not something a rejection should do behind an admin's back.
			const { account, guide } = await createRegisteredGuide();
			await createPaidMembershipTransaction(guide._id.toString(), 500);
			await GuideDB.updateOne({ _id: guide._id }, { $set: { approvalStatus: 'approved' } });
			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			await GuideService.rejectGuide(account._id.toString(), 'Repeated no-shows', adminId);

			expect(mockRefundPayment).not.toHaveBeenCalled();

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.approvalStatus).toBe('rejected');
			// Still delisted — the rejection itself always takes effect.
			expect(updated!.isVisible).toBe(false);
			// Mongoose materialises the nested path as `{}` whether or not a refund
			// happened, so `status` — set only by a real refund — is the honest test.
			expect(updated!.membershipRefund?.status).toBeUndefined();

			// ...and the admin API must report that as *no refund*, not as an empty
			// one: `{}` is truthy, and a truthy refund renders a refund panel.
			const detail = await GuideService.getGuideDetailForAdmin(account._id.toString());
			expect(detail.membershipRefund).toBeNull();
		});

		it('never refunds the same payment twice', async () => {
			const { account, guide } = await createRegisteredGuide();
			await createPaidMembershipTransaction(guide._id.toString(), 500);
			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			mockRefundPayment.mockResolvedValue({ id: 'rfnd_test_1', amount: 500, status: 'processed' });

			await GuideService.rejectGuide(account._id.toString(), 'Licence is unreadable', adminId);
			await GuideService.rejectGuide(account._id.toString(), 'Still unreadable', adminId);

			expect(mockRefundPayment).toHaveBeenCalledTimes(1);
		});

		it('records a failed refund and keeps the fee claimable, without failing the rejection', async () => {
			const { account, guide } = await createRegisteredGuide();
			await createPaidMembershipTransaction(guide._id.toString(), 500);
			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			mockRefundPayment.mockRejectedValue(new Error('Razorpay is down'));

			await GuideService.rejectGuide(account._id.toString(), 'Licence is unreadable', adminId);

			const updated = await GuideDB.findById(guide._id);
			// The rejection still stands — the guide comes off the site either way.
			expect(updated!.approvalStatus).toBe('rejected');
			expect(updated!.isVisible).toBe(false);

			expect(updated!.membershipRefund?.status).toBe('failed');
			expect(updated!.membershipRefund?.failureReason).toBe('Razorpay is down');
			// The money never left, so the claim survives for a retry.
			expect(updated!.membershipPendingActivation).toBe(true);
			expect(updated!.paymentStatus).toBe('success');
		});

		it('retries a previously failed refund on a second rejection', async () => {
			const { account, guide } = await createRegisteredGuide();
			await createPaidMembershipTransaction(guide._id.toString(), 500);
			await GuideService.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');

			mockRefundPayment.mockRejectedValueOnce(new Error('Razorpay is down'));
			await GuideService.rejectGuide(account._id.toString(), 'Licence is unreadable', adminId);

			mockRefundPayment.mockResolvedValueOnce({ id: 'rfnd_retry', amount: 500, status: 'processed' });
			await GuideService.rejectGuide(account._id.toString(), 'Licence is unreadable', adminId);

			expect(mockRefundPayment).toHaveBeenCalledTimes(2);

			const updated = await GuideDB.findById(guide._id);
			expect(updated!.membershipRefund?.status).toBe('processed');
			expect(updated!.membershipRefund?.refundId).toBe('rfnd_retry');
			expect(updated!.paymentStatus).toBe('pending');
		});

		it('does not attempt a refund when no membership fee was ever paid', async () => {
			const { account } = await createRegisteredGuide();

			await GuideService.rejectGuide(account._id.toString(), 'Documents missing', adminId);

			expect(mockRefundPayment).not.toHaveBeenCalled();
		});
	});
});
