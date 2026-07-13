import { AccountDB, CashPaymentDB } from '@mongo';
import CashPaymentService from '@services/cashPayment';
import { ConflictError, NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

let adminId: string;
let guideAccountId: string;

async function createAccount(role: 'admin' | 'guide' | 'tourist', email: string) {
	const account = await AccountDB.create({
		name: `${role} user`,
		email,
		phone: '+1234567890',
		password: 'Password@123',
		role,
		status: 'verified',
	});
	return account._id.toString();
}

const input = (overrides: Record<string, unknown> = {}) => ({
	amount: 2500,
	paymentDate: new Date('2026-07-01'),
	paidBy: 'tourist' as const,
	touristName: 'Jane Doe',
	bookingReference: 'BK000123',
	remarks: 'Paid at the end of the Amber Fort tour',
	...overrides,
});

describe('CashPaymentService', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		adminId = await createAccount('admin', 'admin@example.com');
		guideAccountId = await createAccount('guide', 'guide@example.com');
	});

	describe('create', () => {
		it('records the payment and attributes it to the calling admin', async () => {
			const payment = await CashPaymentService.create({
				guideAccountId,
				data: input(),
				adminUserId: adminId,
			});

			expect(payment.amount).toBe(2500);
			expect(payment.method).toBe('cash');
			expect(payment.paidBy).toBe('tourist');
			expect(payment.status).toBe('received');
			// The audit trail comes from the session, never the request body.
			expect(payment.recordedBy.toString()).toBe(adminId);
			expect(payment.createdBy.toString()).toBe(adminId);
			expect(payment.cashPaymentCode).toMatch(/^CP\d{6}$/);
		});

		it('refuses to file money against an account that is not a guide', async () => {
			const touristId = await createAccount('tourist', 'tourist@example.com');

			await expect(
				CashPaymentService.create({
					guideAccountId: touristId,
					data: input(),
					adminUserId: adminId,
				})
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('update', () => {
		it('edits the record and stamps who changed it', async () => {
			const created = await CashPaymentService.create({
				guideAccountId,
				data: input(),
				adminUserId: adminId,
			});
			const otherAdminId = await createAccount('admin', 'admin2@example.com');

			const updated = await CashPaymentService.update({
				paymentId: created._id.toString(),
				data: { amount: 3000, remarks: 'Corrected amount' },
				adminUserId: otherAdminId,
			});

			expect(updated.amount).toBe(3000);
			expect(updated.remarks).toBe('Corrected amount');
			// The original recorder is preserved; the editor is recorded separately.
			expect(updated.recordedBy.toString()).toBe(adminId);
			expect(updated.updatedBy?.toString()).toBe(otherAdminId);
		});

		it('refuses to edit a voided record', async () => {
			const created = await CashPaymentService.create({
				guideAccountId,
				data: input(),
				adminUserId: adminId,
			});
			await CashPaymentService.void({ paymentId: created._id.toString(), adminUserId: adminId });

			await expect(
				CashPaymentService.update({
					paymentId: created._id.toString(),
					data: { amount: 9999 },
					adminUserId: adminId,
				})
			).rejects.toThrow(ConflictError);
		});
	});

	describe('void', () => {
		it('soft-deletes: the row survives, marked, with who did it and why', async () => {
			const created = await CashPaymentService.create({
				guideAccountId,
				data: input(),
				adminUserId: adminId,
			});

			await CashPaymentService.void({
				paymentId: created._id.toString(),
				reason: 'Recorded against the wrong guide',
				adminUserId: adminId,
			});

			// Never removed — the audit trail is the whole point of voiding.
			const row = await CashPaymentDB.findById(created._id);
			expect(row).not.toBeNull();
			expect(row!.status).toBe('voided');
			expect(row!.deletedAt).toBeInstanceOf(Date);
			expect(row!.deletedBy?.toString()).toBe(adminId);
			expect(row!.voidReason).toBe('Recorded against the wrong guide');
		});

		it('cannot void the same payment twice', async () => {
			const created = await CashPaymentService.create({
				guideAccountId,
				data: input(),
				adminUserId: adminId,
			});
			await CashPaymentService.void({ paymentId: created._id.toString(), adminUserId: adminId });

			await expect(
				CashPaymentService.void({ paymentId: created._id.toString(), adminUserId: adminId })
			).rejects.toThrow(ConflictError);
		});
	});

	describe('visibility', () => {
		it('hides voided payments from the guide but keeps them for the admin', async () => {
			const kept = await CashPaymentService.create({
				guideAccountId,
				data: input({ amount: 1000 }),
				adminUserId: adminId,
			});
			const voided = await CashPaymentService.create({
				guideAccountId,
				data: input({ amount: 4000 }),
				adminUserId: adminId,
			});
			await CashPaymentService.void({ paymentId: voided._id.toString(), adminUserId: adminId });

			const guideView = await CashPaymentService.getMy(guideAccountId);
			expect(guideView.data).toHaveLength(1);
			expect(guideView.data[0]._id.toString()).toBe(kept._id.toString());
			// A voided payment is money the guide never had, so it is out of the total.
			expect(guideView.summary).toEqual({ totalAmount: 1000, count: 1 });

			const adminView = await CashPaymentService.getForGuide(guideAccountId);
			expect(adminView.data).toHaveLength(2);
			expect(adminView.summary).toEqual({ totalAmount: 1000, count: 1 });
		});

		it('never leaks the audit trail to the guide', async () => {
			await CashPaymentService.create({
				guideAccountId,
				data: input(),
				adminUserId: adminId,
			});

			const [payment] = (await CashPaymentService.getMy(guideAccountId))
				.data as unknown as Record<string, unknown>[];

			// The guide sees the money, not who inside the business touched the record.
			expect(payment.recordedBy).toBeUndefined();
			expect(payment.createdBy).toBeUndefined();
			expect(payment.updatedBy).toBeUndefined();
			expect(payment.deletedBy).toBeUndefined();
			expect(payment.amount).toBe(2500);
		});

		it("keeps one guide's payments out of another's", async () => {
			const otherGuideId = await createAccount('guide', 'guide2@example.com');
			await CashPaymentService.create({
				guideAccountId,
				data: input(),
				adminUserId: adminId,
			});

			const otherView = await CashPaymentService.getMy(otherGuideId);
			expect(otherView.data).toHaveLength(0);
			expect(otherView.summary).toEqual({ totalAmount: 0, count: 0 });
		});
	});
});
