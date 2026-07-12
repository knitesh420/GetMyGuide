import AuthService from '@services/auth';
import { AccountDB, BookingDB, InvoiceDB, NotificationDB, ReviewDB, TouristDB, TripDB } from '@mongo';
import express from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import configServer from '../../src/server-config';
import { testSignupData, testUser } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * GET /tourist/dashboard is a read-only aggregate that backs Dashboard Home. It
 * must summarise the same records the detail pages show, so these tests seed a
 * realistic tourist (bookings, a past trip, a future trip, an invoice, an unread
 * notification) and assert every section of the payload against it.
 */
describe('GET /tourist/dashboard', () => {
	let app: express.Application;
	let touristToken: string;
	let guideToken: string;
	let touristId: string;
	let guideId: string;

	const DAY = 86_400_000;
	const futureDate = new Date(Date.now() + 10 * DAY);
	const pastDate = new Date(Date.now() - 30 * DAY);

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	// `transaction_id` carries a unique index, so every seeded booking needs its
	// own — otherwise the second insert in a test collides.
	let txnCounter = 0;

	const seedBooking = (overrides: Record<string, unknown> = {}) => ({
		tourist_info: {
			name: 'Test User',
			gender: 'male',
			phone: '+1234567890',
			email: 'test@example.com',
			country: 'India',
		},
		travel_details: {
			places: ['Taj Mahal'],
			city: 'Agra',
			date: futureDate,
			no_of_person: 2,
			preferences: { hotel: false, taxi: false },
		},
		guide_preferences: { guide_language: ['English'], gender: 'none' },
		booking_configuration: {
			duration: 'full-day',
			foreign_language_required: false,
			early_late_hours: false,
			extra_city_allowances: false,
			special_event_allowances: [],
			price: 5000,
		},
		linked_to: touristId,
		transaction_id: `txn-${++txnCounter}`,
		status: 'confirmed',
		...overrides,
	});

	beforeEach(async () => {
		await clearDatabase();
		txnCounter = 0;

		const touristResult = await AuthService.signup(testUser);
		touristToken = touristResult.accessToken;
		touristId = (await AccountDB.findOne({ email: testUser.email }))!._id.toString();

		// signup() always creates a tourist, so promote the second account to a
		// guide and re-login to get a token that actually carries the guide role.
		const guideEmail = 'guide@example.com';
		await AuthService.signup({ ...testSignupData, email: guideEmail });
		await AccountDB.updateOne(
			{ email: guideEmail },
			{ $set: { role: 'guide', emailVerified: true, status: 'verified' } }
		);
		const guideLogin = await AuthService.login({
			email: guideEmail,
			password: testSignupData.password,
		});
		guideToken = guideLogin.accessToken;
		guideId = (await AccountDB.findOne({ email: guideEmail }))!._id.toString();

		await TouristDB.create({
			accountId: touristId,
			touristCode: 'TO000001',
			nationality: 'Indian',
			preferredLanguages: ['English'],
			travelInterests: ['Heritage'],
			budget: '5000-10000',
			numberOfTravelers: 2,
			about: 'Loves history',
			registrationCompleted: true,
		});
	});

	it('rejects an unauthenticated caller', async () => {
		await request(app).get('/tourist/dashboard').expect(401);
	});

	it('rejects a guide (tourist-only resource)', async () => {
		await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${guideToken}`)
			.expect(403);
	});

	it('returns an empty-but-valid overview for a tourist with no activity', async () => {
		const res = await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${touristToken}`)
			.expect(200);

		expect(res.body.success).toBe(true);
		expect(res.body.profile.touristCode).toBe('TO000001');
		expect(res.body.profile.registrationCompleted).toBe(true);
		expect(res.body.upcomingTrip).toBeNull();
		expect(res.body.recentBookings).toEqual([]);
		expect(res.body.recentTrips).toEqual([]);
		expect(res.body.notifications).toEqual([]);
		expect(res.body.pendingReviews).toEqual([]);
		expect(res.body.activity).toEqual([]);
		expect(res.body.payments).toMatchObject({
			totalPaid: 0,
			pendingAmount: 0,
			invoiceCount: 0,
			latestInvoice: null,
		});
		expect(res.body.stats).toMatchObject({
			upcomingTrips: 0,
			completedTrips: 0,
			activeBookings: 0,
			pendingPayments: 0,
			unreadNotifications: 0,
			pendingReviews: 0,
			totalSpent: 0,
		});
	});

	it('computes profile completion from the filled-in profile fields', async () => {
		const res = await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${touristToken}`)
			.expect(200);

		// 7 of the 8 scored fields are seeded (travelDates is not), and the account
		// carries a phone — so this should be a high but sub-100 score.
		expect(res.body.profile.profileCompletion).toBeGreaterThan(50);
		expect(res.body.profile.profileCompletion).toBeLessThanOrEqual(100);
		expect(res.body.profile.memberSince).toBeTruthy();
	});

	it('summarises bookings, trips, payments, notifications and activity', async () => {
		// A future booking with no Trip yet — should surface as the upcoming
		// 'planned' trip and as an active booking.
		const upcoming = await BookingDB.create(seedBooking({ bookingCode: 'BK000001' }));

		// A past, completed trip — should count as completed and be awaiting a review.
		const past = await BookingDB.create(
			seedBooking({
				bookingCode: 'BK000002',
				status: 'completed',
				travel_details: {
					places: ['Gateway of India'],
					city: 'Mumbai',
					date: pastDate,
					no_of_person: 1,
					preferences: { hotel: false, taxi: false },
				},
			})
		);

		await TripDB.create({
			booking: past._id,
			assignment: new Types.ObjectId(),
			guide: guideId,
			status: 'completed',
			tripCode: 'TR000001',
			completedAt: pastDate,
		});

		// A booking still awaiting payment — drives the pending-payment figures.
		await BookingDB.create(seedBooking({ bookingCode: 'BK000003', status: 'payment-pending' }));

		await NotificationDB.create({
			recipient: touristId,
			type: 'guide_assigned',
			title: 'Guide assigned',
			message: 'A guide has been assigned to your trip.',
			dedupeKey: `guide_assigned-${upcoming._id}`,
			isRead: false,
		});

		await InvoiceDB.create({
			invoiceNumber: 'INV-0001',
			invoiceType: 'booking',
			invoiceDate: pastDate,
			paymentDate: pastDate,
			transaction: new Types.ObjectId(),
			booking: past._id,
			touristAccount: touristId,
			customerSnapshot: {
				name: 'Test User',
				email: 'test@example.com',
				phone: '+1234567890',
				country: 'India',
			},
			bookingSnapshot: { destination: 'Mumbai' },
			paymentInfo: { amount: 4000, grandTotal: 4000, status: 'paid', currency: 'INR' },
			companyInfo: {
				name: 'GetMyGuide',
				supportEmail: 'support@getmyguide.in',
				supportPhone: '+910000000000',
				website: 'https://getmyguide.in',
				address: 'India',
			},
			status: 'paid',
		});

		const res = await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${touristToken}`)
			.expect(200);

		const { stats, upcomingTrip, payments, pendingReviews, notifications, activity } = res.body;

		// Upcoming = the paid future booking with no guide yet. The unpaid booking
		// (BK000003) is also in the future but must NOT be offered as the next
		// trip — it isn't paid for, and it already counts under pending payments.
		expect(upcomingTrip).not.toBeNull();
		expect(upcomingTrip.destination).toBe('Agra');
		expect(upcomingTrip.status).toBe('planned');
		expect(upcomingTrip.guide).toBeNull();
		expect(upcomingTrip.bookingCode).toBe('BK000001');

		expect(stats.upcomingTrips).toBe(1);
		expect(stats.completedTrips).toBe(1);
		// 'confirmed' counts as active; 'completed' and 'payment-pending' do not.
		expect(stats.activeBookings).toBe(1);
		expect(stats.pendingPayments).toBe(1);
		expect(stats.unreadNotifications).toBe(1);
		expect(stats.pendingReviews).toBe(1);
		expect(stats.totalSpent).toBe(4000);

		// Paid comes from the invoice; pending is the unpaid booking's full price.
		expect(payments.totalPaid).toBe(4000);
		expect(payments.pendingAmount).toBe(5000);
		expect(payments.invoiceCount).toBe(1);
		expect(payments.latestInvoice.invoiceNumber).toBe('INV-0001');

		expect(pendingReviews).toHaveLength(1);
		expect(pendingReviews[0].destination).toBe('Mumbai');

		expect(notifications).toHaveLength(1);
		expect(notifications[0].isRead).toBe(false);

		// Newest first, and every source is represented.
		const types = activity.map((entry: { type: string }) => entry.type);
		expect(types).toContain('booking-created');
		expect(types).toContain('payment-successful');
		expect(types).toContain('guide-assigned');
		expect(types).toContain('trip-updated');

		const timestamps = activity.map((entry: { at: string }) => new Date(entry.at).getTime());
		expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
	});

	it('drops a trip from pending reviews once it has been reviewed', async () => {
		const past = await BookingDB.create(
			seedBooking({ bookingCode: 'BK000010', status: 'completed', travel_details: {
				places: ['Hawa Mahal'],
				city: 'Jaipur',
				date: pastDate,
				no_of_person: 1,
				preferences: { hotel: false, taxi: false },
			} })
		);

		await TripDB.create({
			booking: past._id,
			assignment: new Types.ObjectId(),
			guide: guideId,
			status: 'completed',
			completedAt: pastDate,
		});

		await ReviewDB.create({
			booking: past._id,
			guide: guideId,
			tourist: touristId,
			rating: 5,
			comment: 'Excellent guide',
		});

		const res = await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${touristToken}`)
			.expect(200);

		expect(res.body.pendingReviews).toEqual([]);
		expect(res.body.stats.pendingReviews).toBe(0);
		expect(res.body.activity.map((e: { type: string }) => e.type)).toContain('review-submitted');
	});

	it('surfaces the assigned guide and their rating on the upcoming trip', async () => {
		const booking = await BookingDB.create(seedBooking({ bookingCode: 'BK000020' }));

		await TripDB.create({
			booking: booking._id,
			assignment: new Types.ObjectId(),
			guide: guideId,
			status: 'not-started',
			tripCode: 'TR000020',
		});

		// Two visible reviews for this guide -> average 4.5.
		await ReviewDB.create({
			booking: new Types.ObjectId(),
			guide: guideId,
			tourist: touristId,
			rating: 5,
		});
		await ReviewDB.create({
			booking: new Types.ObjectId(),
			guide: guideId,
			tourist: touristId,
			rating: 4,
		});

		const res = await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${touristToken}`)
			.expect(200);

		expect(res.body.upcomingTrip.status).toBe('not-started');
		expect(res.body.upcomingTrip.guide).toMatchObject({
			// The guide account is seeded from testSignupData, whose name is 'New User'.
			name: testSignupData.name,
			rating: 4.5,
			ratingCount: 2,
		});
		expect(res.body.stats.upcomingTrips).toBe(1);
	});

	it('ignores trips that are already over when picking the upcoming trip', async () => {
		const past = await BookingDB.create(
			seedBooking({
				bookingCode: 'BK000030',
				status: 'completed',
				travel_details: {
					places: ['Charminar'],
					city: 'Hyderabad',
					date: pastDate,
					no_of_person: 1,
					preferences: { hotel: false, taxi: false },
				},
			})
		);

		await TripDB.create({
			booking: past._id,
			assignment: new Types.ObjectId(),
			guide: guideId,
			status: 'completed',
			completedAt: pastDate,
		});

		const res = await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${touristToken}`)
			.expect(200);

		expect(res.body.upcomingTrip).toBeNull();
		expect(res.body.stats.upcomingTrips).toBe(0);
		expect(res.body.stats.completedTrips).toBe(1);
	});

	it('never offers an unpaid booking as the upcoming trip', async () => {
		// The only future booking this tourist has is one they haven't paid for.
		await BookingDB.create(seedBooking({ bookingCode: 'BK000040', status: 'payment-pending' }));

		const res = await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${touristToken}`)
			.expect(200);

		expect(res.body.upcomingTrip).toBeNull();
		expect(res.body.stats.upcomingTrips).toBe(0);
		// It is still owed for, and still listed among the trips.
		expect(res.body.stats.pendingPayments).toBe(1);
		expect(res.body.payments.pendingAmount).toBe(5000);
		expect(res.body.recentTrips).toHaveLength(1);
	});

	it('caps the preview lists at what the dashboard renders', async () => {
		for (let i = 0; i < 5; i++) {
			await BookingDB.create(seedBooking({ bookingCode: `BK00010${i}` }));
		}

		const res = await request(app)
			.get('/tourist/dashboard')
			.set('Authorization', `Bearer ${touristToken}`)
			.expect(200);

		expect(res.body.recentBookings).toHaveLength(3);
		expect(res.body.recentTrips).toHaveLength(3);
		expect(res.body.stats.activeBookings).toBe(5);
	});
});
