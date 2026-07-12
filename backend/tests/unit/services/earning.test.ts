import { AccountDB, BookingDB, EarningDB, GuideDB, PayoutDB, TripDB } from '@mongo';
import { Types } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

jest.mock('@config/const', () => ({
	...jest.requireActual('@config/const'),
	PLATFORM_COMMISSION_RATE: 20,
	EARNING_HOLD_DAYS: 3,
}));

import EarningService from '@services/earning';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
		status: 'completed' as const,
		...overrides,
	};
}

describe('EarningService', () => {
	let guideId: Types.ObjectId;
	let adminId: Types.ObjectId;

	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();

		const guide = await AccountDB.create({
			name: 'Ravi Guide',
			email: 'ravi@example.com',
			phone: '+911111111111',
			password: 'Password@123',
			role: 'guide',
		});
		guideId = guide._id;

		const admin = await AccountDB.create({
			name: 'Ops Admin',
			email: 'admin@example.com',
			phone: '+912222222222',
			password: 'Password@123',
			role: 'admin',
		});
		adminId = admin._id;
	});

	/** A completed trip on a booking of `price`, ready to accrue. */
	async function completedTrip(price: number) {
		const booking = await BookingDB.create(bookingFixture(price));
		const trip = await TripDB.create({
			booking: booking._id,
			assignment: new Types.ObjectId(),
			guide: guideId,
			status: 'completed',
			completedAt: new Date(),
		});
		return { booking, trip };
	}

	describe('accrueForTrip', () => {
		it('credits the guide the booking price minus the platform commission', async () => {
			const { trip } = await completedTrip(5000);

			const earning = await EarningService.accrueForTrip(trip);

			expect(earning).not.toBeNull();
			expect(earning!.grossAmount).toBe(5000);
			expect(earning!.commissionRate).toBe(20);
			expect(earning!.commissionAmount).toBe(1000);
			expect(earning!.netAmount).toBe(4000);
			expect(earning!.status).toBe('pending');
		});

		it('holds the earning for the configured window before it is payable', async () => {
			const { trip } = await completedTrip(5000);

			const earning = await EarningService.accrueForTrip(trip);

			const heldForDays = Math.round(
				(earning!.payableAt.getTime() - Date.now()) / ONE_DAY_MS
			);
			expect(heldForDays).toBe(3);
		});

		// The unique index on Earning.trip is the guard. Without it, a retried or
		// double-fired trip completion would pay the guide twice.
		it('is idempotent — a second accrual for the same trip creates nothing', async () => {
			const { trip } = await completedTrip(5000);

			await EarningService.accrueForTrip(trip);
			const second = await EarningService.accrueForTrip(trip);

			expect(second).toBeNull();
			expect(await EarningDB.countDocuments({ trip: trip._id })).toBe(1);
		});

		it('accrues nothing for a zero-value booking', async () => {
			const { trip } = await completedTrip(0);

			const earning = await EarningService.accrueForTrip(trip);

			expect(earning).toBeNull();
			expect(await EarningDB.countDocuments({})).toBe(0);
		});

		// Never throws: a ledger failure must not roll back a trip the guide has
		// already finished in the real world.
		it('returns null rather than throwing when the booking has vanished', async () => {
			const trip = await TripDB.create({
				booking: new Types.ObjectId(),
				assignment: new Types.ObjectId(),
				guide: guideId,
				status: 'completed',
			});

			await expect(EarningService.accrueForTrip(trip)).resolves.toBeNull();
		});
	});

	describe('promoteMaturedEarnings', () => {
		it('promotes only the earnings whose hold window has passed', async () => {
			const { trip: matureTrip } = await completedTrip(5000);
			const { trip: freshTrip } = await completedTrip(3000);

			await EarningService.accrueForTrip(matureTrip);
			await EarningService.accrueForTrip(freshTrip);

			// Backdate one earning past its hold window.
			await EarningDB.updateOne(
				{ trip: matureTrip._id },
				{ payableAt: new Date(Date.now() - ONE_DAY_MS) }
			);

			const promoted = await EarningService.promoteMaturedEarnings();

			expect(promoted).toBe(1);
			expect((await EarningDB.findOne({ trip: matureTrip._id }))!.status).toBe('payable');
			expect((await EarningDB.findOne({ trip: freshTrip._id }))!.status).toBe('pending');
		});
	});

	describe('reverseForBooking', () => {
		it('voids an unpaid earning when its booking is refunded', async () => {
			const { booking, trip } = await completedTrip(5000);
			await EarningService.accrueForTrip(trip);

			const result = await EarningService.reverseForBooking(booking._id);

			expect(result.reversed).toBe(1);
			expect(result.alreadyPaid).toBe(0);
			expect((await EarningDB.findOne({ trip: trip._id }))!.status).toBe('reversed');
		});

		// Reversing an earning the platform has already paid out would misstate
		// what actually left the bank. Report it instead, and leave it alone.
		it('leaves an already-paid earning intact and reports it', async () => {
			const { booking, trip } = await completedTrip(5000);
			await EarningService.accrueForTrip(trip);
			await EarningDB.updateOne({ trip: trip._id }, { status: 'paid' });

			const result = await EarningService.reverseForBooking(booking._id);

			expect(result.reversed).toBe(0);
			expect(result.alreadyPaid).toBe(1);
			expect((await EarningDB.findOne({ trip: trip._id }))!.status).toBe('paid');
		});
	});

	describe('summaryFor', () => {
		it('separates money on hold, money ready to pay, and money already paid', async () => {
			const { trip: a } = await completedTrip(5000); // net 4000
			const { trip: b } = await completedTrip(2500); // net 2000
			const { trip: c } = await completedTrip(1000); // net 800

			await EarningService.accrueForTrip(a);
			await EarningService.accrueForTrip(b);
			await EarningService.accrueForTrip(c);

			await EarningDB.updateOne({ trip: b._id }, { status: 'payable' });
			await EarningDB.updateOne({ trip: c._id }, { status: 'paid' });

			const summary = await EarningService.summaryFor(guideId);

			expect(summary.pendingAmount).toBe(4000);
			expect(summary.payableAmount).toBe(2000);
			expect(summary.paidAmount).toBe(800);
			expect(summary.outstandingAmount).toBe(6000);
			expect(summary.lifetimeAmount).toBe(6800);
		});
	});

	describe('createPayout', () => {
		async function payableEarning(price: number) {
			const { trip } = await completedTrip(price);
			await EarningService.accrueForTrip(trip);
			await EarningDB.updateOne({ trip: trip._id }, { status: 'payable' });
			return (await EarningDB.findOne({ trip: trip._id }))!;
		}

		it('settles the selected earnings and records where the money went', async () => {
			await GuideDB.create({
				accountId: guideId,
				city: 'Jaipur',
				registrationCompleted: true,
				bankDetails: {
					accountHolderName: 'Ravi Guide',
					accountNumber: '123456789012',
					ifsc: 'HDFC0001234',
				},
			});

			const first = await payableEarning(5000); // net 4000
			const second = await payableEarning(2500); // net 2000

			const payout = await EarningService.createPayout({
				guideId: guideId.toString(),
				earningIds: [first._id.toString(), second._id.toString()],
				method: 'bank_transfer',
				reference: 'N123456789012345',
				adminUserId: adminId.toString(),
			});

			expect(payout.amount).toBe(6000);
			// Snapshot, not a live ref — only the last 4 digits are retained.
			expect(payout.paidTo?.accountNumberLast4).toBe('9012');

			expect((await EarningDB.findById(first._id))!.status).toBe('paid');
			expect((await EarningDB.findById(second._id))!.status).toBe('paid');
			expect((await EarningDB.findById(first._id))!.payout?.toString()).toBe(
				payout._id.toString()
			);
		});

		// The status filter in the re-read is what stops a stale queue (or a
		// double-click) settling the same earning against two payouts.
		it('refuses to settle an earning that is no longer payable', async () => {
			const earning = await payableEarning(5000);
			await EarningDB.updateOne({ _id: earning._id }, { status: 'paid' });

			await expect(
				EarningService.createPayout({
					guideId: guideId.toString(),
					earningIds: [earning._id.toString()],
					method: 'upi',
					reference: 'upi-123',
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(ConflictError);
		});

		// Guards against one guide's earnings being settled against another's payout.
		it("refuses to settle another guide's earnings", async () => {
			const otherGuide = await AccountDB.create({
				name: 'Other Guide',
				email: 'other@example.com',
				phone: '+913333333333',
				password: 'Password@123',
				role: 'guide',
			});

			const earning = await payableEarning(5000);

			await expect(
				EarningService.createPayout({
					guideId: otherGuide._id.toString(),
					earningIds: [earning._id.toString()],
					method: 'upi',
					reference: 'upi-123',
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(ConflictError);

			expect((await EarningDB.findById(earning._id))!.status).toBe('payable');
			expect(await PayoutDB.countDocuments({})).toBe(0);
		});

		it('rejects a payout against an account that is not a guide', async () => {
			await expect(
				EarningService.createPayout({
					guideId: adminId.toString(),
					earningIds: [new Types.ObjectId().toString()],
					method: 'cash',
					reference: 'cash-1',
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(NotFoundError);
		});

		it('rejects an empty payout', async () => {
			await expect(
				EarningService.createPayout({
					guideId: guideId.toString(),
					earningIds: [],
					method: 'cash',
					reference: 'cash-1',
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('getPayoutQueue', () => {
		it('groups payable earnings by guide with the total owed', async () => {
			await GuideDB.create({
				accountId: guideId,
				city: 'Jaipur',
				registrationCompleted: true,
				guideCode: 'GU000001',
			});

			const { trip: a } = await completedTrip(5000); // net 4000
			const { trip: b } = await completedTrip(2500); // net 2000
			const { trip: c } = await completedTrip(1000); // net 800 — stays on hold

			await EarningService.accrueForTrip(a);
			await EarningService.accrueForTrip(b);
			await EarningService.accrueForTrip(c);

			await EarningDB.updateMany({ trip: { $in: [a._id, b._id] } }, { status: 'payable' });

			const queue = await EarningService.getPayoutQueue();

			expect(queue).toHaveLength(1);
			expect(queue[0].guideId).toBe(guideId.toString());
			expect(queue[0].guideCode).toBe('GU000001');
			// Only the payable pair — the held earning is not owed yet.
			expect(queue[0].amount).toBe(6000);
			expect(queue[0].earningCount).toBe(2);
		});

		it('is empty when nothing has matured', async () => {
			const { trip } = await completedTrip(5000);
			await EarningService.accrueForTrip(trip);

			await expect(EarningService.getPayoutQueue()).resolves.toEqual([]);
		});
	});
});
