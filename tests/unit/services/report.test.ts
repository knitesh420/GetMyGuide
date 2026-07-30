import {
	AccountDB,
	AssignmentDB,
	BookingDB,
	GuideDB,
	ReviewDB,
	TouristDB,
	TransactionDB,
	TripDB,
} from '@mongo';
import ReportService from '@services/report';
import { Types } from 'mongoose';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

function bookingFixture(overrides: Partial<Record<string, any>> = {}) {
	return {
		tourist_info: {
			name: 'Jane Doe',
			gender: 'female' as const,
			phone: '+1234567890',
			email: 'jane@example.com',
			country: 'USA',
		},
		travel_details: {
			places: ['Lake Pichola'],
			city: 'Udaipur',
			date: new Date('2026-11-01'),
			no_of_person: 2,
			preferences: { hotel: true, taxi: false },
		},
		guide_preferences: { guide_language: ['English'], gender: 'none' as const },
		booking_configuration: {
			duration: 'full-day' as const,
			foreign_language_required: false,
			early_late_hours: false,
			extra_city_allowances: false,
			special_event_allowances: [],
			price: 5000,
		},
		transaction_id: `txn-${new Types.ObjectId().toString()}`,
		status: 'completed' as const,
		...overrides,
	};
}

function transactionFixture(overrides: Partial<Record<string, any>> = {}) {
	return {
		reference_id: new Types.ObjectId().toString(),
		reference_type: 'booking',
		type: 'tourist' as const,
		razorpay_order_id: `order_${new Types.ObjectId().toString()}`,
		razorpay_customer_id: 'cust_1',
		transaction_id: `txn_${new Types.ObjectId().toString()}`,
		status: 'success' as const,
		amount: 1000,
		currency: 'INR',
		...overrides,
	};
}

describe('ReportService', () => {
	let guideId: Types.ObjectId;
	let touristId: Types.ObjectId;
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
			name: 'Guide One',
			email: 'guide1@example.com',
			phone: '+1000000001',
			password: 'password123',
			role: 'guide',
		});
		guideId = guide._id;

		const tourist = await AccountDB.create({
			name: 'Tourist One',
			email: 'tourist1@example.com',
			phone: '+1000000002',
			password: 'password123',
			role: 'tourist',
		});
		touristId = tourist._id;

		const admin = await AccountDB.create({
			name: 'Admin',
			email: 'admin@example.com',
			phone: '+1000000003',
			password: 'password123',
			role: 'admin',
		});
		adminId = admin._id;
	});

	describe('getOverview', () => {
		it('aggregates counts and sums across bookings, guides, tourists, assignments, trips, and reviews', async () => {
			await BookingDB.create(bookingFixture({ linked_to: touristId }));
			await BookingDB.create(bookingFixture({ linked_to: touristId, transaction_id: 'txn-2' }));

			await TransactionDB.create(transactionFixture({ amount: 1000, status: 'success' }));
			await TransactionDB.create(transactionFixture({ amount: 2000, status: 'paid' }));
			await TransactionDB.create(transactionFixture({ amount: 500, status: 'failed' })); // excluded

			await TransactionDB.create(
				transactionFixture({
					reference_type: 'guide_membership',
					status: 'success',
					amount: 500,
				})
			);

			await GuideDB.create({
				accountId: guideId,
				isVisible: true,
				membershipExpiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
			});

			await TouristDB.create({ accountId: touristId, registrationCompleted: true });

			await AssignmentDB.create({
				booking: new Types.ObjectId(),
				guide: guideId,
				assignedBy: adminId,
				status: 'pending',
			});

			const tripBookingA = await BookingDB.create(bookingFixture({ transaction_id: 'txn-trip-a' }));
			const tripBookingB = await BookingDB.create(bookingFixture({ transaction_id: 'txn-trip-b' }));
			await TripDB.create({
				booking: tripBookingA._id,
				assignment: new Types.ObjectId(),
				guide: guideId,
				status: 'completed',
			});
			await TripDB.create({
				booking: tripBookingB._id,
				assignment: new Types.ObjectId(),
				guide: guideId,
				status: 'cancelled',
			});

			await ReviewDB.create({
				booking: new Types.ObjectId(),
				guide: guideId,
				tourist: touristId,
				rating: 4,
			});
			await ReviewDB.create({
				booking: new Types.ObjectId(),
				guide: guideId,
				tourist: touristId,
				rating: 2,
				isHidden: true,
			});

			const overview = await ReportService.getOverview();

			expect(overview.totalBookings).toBe(4);
			expect(overview.totalRevenue).toBe(3500); // 1000 + 2000 + 500 (membership), excludes the failed one
			expect(overview.activeGuides).toBe(1);
			expect(overview.activeTourists).toBe(1);
			expect(overview.pendingAssignments).toBe(1);
			expect(overview.totalTrips).toBe(2);
			expect(overview.completedTrips).toBe(1);
			expect(overview.cancelledTrips).toBe(1);
			expect(overview.membershipRenewals).toBe(1);
			expect(overview.avgRating).toBe(4); // hidden review excluded
			expect(overview.totalReviews).toBe(1);
		});
	});

	describe('getBookingsTrend', () => {
		it('groups bookings and revenue by day within the requested range', async () => {
			await BookingDB.create(bookingFixture({ transaction_id: 'txn-recent' }));
			await TransactionDB.create(transactionFixture({ amount: 1200, status: 'success' }));

			const trend = await ReportService.getBookingsTrend('7d');

			expect(trend.length).toBeGreaterThan(0);
			const totalBookingsInTrend = trend.reduce((sum, point) => sum + point.bookings, 0);
			const totalRevenueInTrend = trend.reduce((sum, point) => sum + point.revenue, 0);
			expect(totalBookingsInTrend).toBe(1);
			expect(totalRevenueInTrend).toBe(1200);
		});
	});

	describe('getGuidePerformance', () => {
		it('ranks guides by completed trips and includes their rating', async () => {
			const otherGuide = await AccountDB.create({
				name: 'Guide Two',
				email: 'guide2@example.com',
				phone: '+1000000004',
				password: 'password123',
				role: 'guide',
			});

			await AssignmentDB.create({
				booking: new Types.ObjectId(),
				guide: guideId,
				assignedBy: adminId,
				status: 'accepted',
			});
			await AssignmentDB.create({
				booking: new Types.ObjectId(),
				guide: otherGuide._id,
				assignedBy: adminId,
				status: 'pending',
			});

			const bookingA = await BookingDB.create(bookingFixture({ transaction_id: 'txn-perf-a' }));
			const bookingB = await BookingDB.create(bookingFixture({ transaction_id: 'txn-perf-b' }));
			await TripDB.create({
				booking: bookingA._id,
				assignment: new Types.ObjectId(),
				guide: guideId,
				status: 'completed',
			});
			await TripDB.create({
				booking: bookingB._id,
				assignment: new Types.ObjectId(),
				guide: guideId,
				status: 'completed',
			});

			await ReviewDB.create({
				booking: new Types.ObjectId(),
				guide: guideId,
				tourist: touristId,
				rating: 5,
			});

			const rows = await ReportService.getGuidePerformance(10);

			expect(rows[0].guideId).toBe(guideId.toString());
			expect(rows[0].tripsCompleted).toBe(2);
			expect(rows[0].assignmentsCount).toBe(1);
			expect(rows[0].avgRating).toBe(5);
			expect(rows[0].totalReviews).toBe(1);
		});
	});
});
