import { AccountDB, BookingDB, InvoiceDB, NotificationDB, ReviewDB, TripDB } from '@mongo';
import { Types } from 'mongoose';
import BookingService from './booking';
import TouristService from './tourist';

/**
 * Read-only aggregator behind GET /tourist/dashboard.
 *
 * The tourist Dashboard Home is a summary of pages that each already have their
 * own endpoint (My Bookings, My Trips, Reviews, Notifications). Fetching it by
 * calling five of those endpoints costs five round trips and over-fetches — the
 * home page only ever shows the top 3-5 of each list. This composes the same
 * data server-side, in parallel, and returns just the slices the page renders.
 *
 * It adds no business logic of its own: bookings come from BookingService and
 * the profile from TouristService, so the shapes stay identical to the detail
 * pages. Everything here is a read; nothing in this file writes.
 */

/** Bookings that are paid for and still running — i.e. not finished or cancelled. */
const ACTIVE_BOOKING_STATUSES = ['successful', 'confirmed', 'allocated'] as const;

/** A booking whose money is still outstanding, in whole or in part. */
const UNPAID_BOOKING_STATUS = 'payment-pending';

/** How many rows each preview section on the dashboard shows. */
const RECENT_BOOKINGS = 3;
const RECENT_TRIPS = 3;
const RECENT_NOTIFICATIONS = 5;
const RECENT_ACTIVITY = 8;

type ActivityType =
	| 'booking-created'
	| 'payment-successful'
	| 'guide-assigned'
	| 'trip-updated'
	| 'review-submitted';

interface ActivityEntry {
	id: string;
	type: ActivityType;
	title: string;
	description: string;
	at: Date;
	href?: string;
}

/**
 * Weight of each profile field in the completion ring. Contact details come from
 * the Account (always present at signup), so they aren't scored — only the parts
 * of the Tourist profile the user actually fills in during onboarding count.
 */
const PROFILE_FIELDS: { key: string; filled: (p: TouristProfileShape) => boolean }[] = [
	{ key: 'nationality', filled: (p) => Boolean(p.nationality) },
	{ key: 'preferredLanguages', filled: (p) => p.preferredLanguages.length > 0 },
	{ key: 'travelInterests', filled: (p) => p.travelInterests.length > 0 },
	{ key: 'budget', filled: (p) => Boolean(p.budget) },
	{ key: 'numberOfTravelers', filled: (p) => p.numberOfTravelers > 0 },
	{ key: 'about', filled: (p) => Boolean(p.about) },
	{ key: 'mobile', filled: (p) => Boolean(p.mobile) },
	{ key: 'travelDates', filled: (p) => Boolean(p.travelDates?.startDate) },
];

type TouristProfileShape = Awaited<ReturnType<typeof TouristService.getTouristProfile>>;

class TouristDashboardService {
	/**
	 * Everything the tourist Dashboard Home renders, in one payload.
	 *
	 * The six independent reads run concurrently — the endpoint is as slow as its
	 * slowest query, not the sum of all of them.
	 */
	async getOverview(accountId: string) {
		const userId = new Types.ObjectId(accountId);

		const [profile, account, bookings, trips, notifications, unreadNotifications, reviews, invoices] =
			await Promise.all([
				TouristService.getTouristProfile(accountId),
				AccountDB.findById(accountId).select('createdAt').lean(),
				BookingService.getMyBookings(userId),
				this.getTripsForTourist(accountId),
				NotificationDB.find({ recipient: accountId })
					.sort({ createdAt: -1 })
					.limit(RECENT_NOTIFICATIONS)
					.lean(),
				NotificationDB.countDocuments({ recipient: accountId, isRead: false }),
				ReviewDB.find({ tourist: accountId }).select('booking rating createdAt').sort({ createdAt: -1 }).lean(),
				InvoiceDB.find({ touristAccount: accountId, status: 'paid' })
					.select('invoiceNumber invoiceDate paymentDate paymentInfo bookingSnapshot')
					.sort({ paymentDate: -1, createdAt: -1 })
					.lean(),
			]);

		const reviewedBookingIds = new Set(reviews.map((r) => r.booking?.toString()).filter(Boolean));

		// The hero card and the "Upcoming Trips" stat must agree, so both are read
		// off the same candidate set rather than each applying its own filter.
		const upcomingCandidates = this.upcomingCandidates(trips);
		const upcomingTrip = await this.buildUpcomingTrip(upcomingCandidates[0]);
		const pendingReviews = this.buildPendingReviews(trips, reviewedBookingIds);
		const payments = this.buildPayments(invoices, bookings);

		return {
			profile: {
				...profile,
				profileCompletion: this.profileCompletion(profile),
				memberSince: account?.createdAt ?? null,
			},
			stats: {
				upcomingTrips: upcomingCandidates.length,
				completedTrips: trips.filter((t) => t.status === 'completed').length,
				activeBookings: bookings.filter((b) =>
					(ACTIVE_BOOKING_STATUSES as readonly string[]).includes(b.status)
				).length,
				pendingPayments: bookings.filter(
					(b) => b.status === UNPAID_BOOKING_STATUS || (b.balance_due ?? 0) > 0
				).length,
				unreadNotifications,
				pendingReviews: pendingReviews.length,
				totalSpent: payments.totalPaid,
			},
			upcomingTrip,
			recentBookings: bookings.slice(0, RECENT_BOOKINGS),
			recentTrips: trips.slice(0, RECENT_TRIPS),
			notifications,
			payments,
			pendingReviews,
			activity: this.buildActivity(bookings, trips, reviews, invoices),
		};
	}

	/**
	 * The tourist's trips, newest first — a booking with no Trip yet appears as a
	 * synthetic 'planned' entry so it still shows up before a guide is assigned.
	 * Mirrors TripService.getMyAsTourist, but unpaginated: the dashboard needs the
	 * full set to count stats and pick the next trip, and only slices for display.
	 */
	private async getTripsForTourist(accountId: string) {
		const bookings = await BookingDB.find({ linked_to: accountId })
			.select('_id travel_details status createdAt bookingCode')
			.sort({ createdAt: -1 })
			.lean();

		const trips = await TripDB.find({ booking: { $in: bookings.map((b) => b._id) } })
			.populate('booking', 'travel_details status bookingCode')
			.populate('guide', 'name email phone')
			.lean();

		const tripByBooking = new Map(
			trips.map((trip) => {
				const ref = trip.booking as unknown as { _id?: Types.ObjectId } | Types.ObjectId | null;
				const key = ref && typeof ref === 'object' && '_id' in ref ? ref._id?.toString() : ref?.toString();
				return [key ?? '', trip] as const;
			})
		);

		return bookings.map((booking) => {
			const existing = tripByBooking.get(booking._id.toString());
			if (existing) return existing as unknown as TouristTrip;

			return {
				_id: `planned-${booking._id.toString()}`,
				booking: {
					_id: booking._id,
					travel_details: booking.travel_details,
					status: booking.status,
					bookingCode: booking.bookingCode,
				},
				assignment: null,
				guide: null,
				status: 'planned',
				createdAt: booking.createdAt,
				updatedAt: booking.createdAt,
			} as unknown as TouristTrip;
		});
	}

	/**
	 * Trips the tourist is actually going on: still to come, not finished or
	 * cancelled, and paid for. An unpaid booking is deliberately excluded — it
	 * already shows up under Pending Payments, and presenting it as your next trip
	 * would promise a journey that isn't booked yet. Soonest first, except that a
	 * trip already under way is "now" and always leads.
	 */
	private upcomingCandidates(trips: TouristTrip[]): TouristTrip[] {
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		return trips
			.filter((trip) => {
				if (trip.status === 'completed' || trip.status === 'cancelled') return false;
				if (
					trip.booking.status === UNPAID_BOOKING_STATUS ||
					trip.booking.status === 'cancelled'
				) {
					return false;
				}
				const date = trip.booking?.travel_details?.date;
				return date ? new Date(date) >= startOfToday : false;
			})
			.sort((a, b) => {
				if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
				if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
				const aDate = new Date(a.booking.travel_details.date).getTime();
				const bDate = new Date(b.booking.travel_details.date).getTime();
				return aDate - bDate;
			});
	}

	/**
	 * Shapes the leading candidate for the hero card, enriched with the assigned
	 * guide's rating so the card needs no second request.
	 */
	private async buildUpcomingTrip(trip: TouristTrip | undefined) {
		if (!trip) return null;

		const guide = this.asGuide(trip.guide);
		const rating = guide ? await this.guideRating(guide._id.toString()) : null;

		return {
			_id: trip._id.toString(),
			tripCode: trip.tripCode ?? null,
			status: trip.status,
			bookingId: trip.booking._id.toString(),
			bookingCode: trip.booking.bookingCode ?? null,
			bookingStatus: trip.booking.status,
			destination: trip.booking.travel_details.city,
			places: trip.booking.travel_details.places ?? [],
			travelDate: trip.booking.travel_details.date,
			travelers: trip.booking.travel_details.no_of_person,
			guide: guide
				? {
						_id: guide._id.toString(),
						name: guide.name,
						email: guide.email,
						phone: guide.phone,
						rating: rating?.average ?? 0,
						ratingCount: rating?.total ?? 0,
					}
				: null,
		};
	}

	/** Average rating and review count for one guide, hidden reviews excluded. */
	private async guideRating(guideId: string) {
		const [aggregate] = await ReviewDB.aggregate<{ average: number; total: number }>([
			{ $match: { guide: new Types.ObjectId(guideId), isHidden: { $ne: true } } },
			{ $group: { _id: '$guide', average: { $avg: '$rating' }, total: { $sum: 1 } } },
		]);

		return aggregate ? { average: Number(aggregate.average.toFixed(1)), total: aggregate.total } : null;
	}

	/** Completed trips the tourist hasn't reviewed yet — drives the reminder card. */
	private buildPendingReviews(trips: TouristTrip[], reviewedBookingIds: Set<string | undefined>) {
		return trips
			.filter((trip) => trip.status === 'completed' && !reviewedBookingIds.has(trip.booking._id.toString()))
			.map((trip) => {
				const guide = this.asGuide(trip.guide);
				return {
					tripId: trip._id.toString(),
					bookingId: trip.booking._id.toString(),
					tripCode: trip.tripCode ?? null,
					destination: trip.booking.travel_details.city,
					completedAt: trip.completedAt ?? trip.updatedAt,
					guide: guide ? { _id: guide._id.toString(), name: guide.name } : null,
				};
			});
	}

	/**
	 * The payments widget. Money actually received is read from paid invoices (the
	 * accounting record), while what's still owed is read from the bookings — a
	 * package booking carries its outstanding balance in `balance_due`, and a
	 * booking stuck at 'payment-pending' owes its full price.
	 */
	private buildPayments(invoices: InvoiceRow[], bookings: TouristBooking[]) {
		const totalPaid = invoices.reduce((sum, invoice) => sum + (invoice.paymentInfo?.grandTotal ?? 0), 0);

		const pendingAmount = bookings.reduce((sum, booking) => {
			if (booking.status === 'cancelled' || booking.status === 'completed') return sum;
			if (booking.status === UNPAID_BOOKING_STATUS) {
				return sum + (booking.booking_configuration?.price ?? 0);
			}
			return sum + (booking.balance_due ?? 0);
		}, 0);

		const latest = invoices[0];

		return {
			totalPaid,
			pendingAmount,
			invoiceCount: invoices.length,
			latestInvoice: latest
				? {
						_id: latest._id.toString(),
						invoiceNumber: latest.invoiceNumber,
						amount: latest.paymentInfo?.grandTotal ?? 0,
						currency: latest.paymentInfo?.currency ?? 'INR',
						paidAt: latest.paymentDate ?? latest.invoiceDate,
						destination: latest.bookingSnapshot?.destination ?? null,
					}
				: null,
		};
	}

	/**
	 * A single newest-first timeline merged from the four things that happen to a
	 * tourist's booking: it's created, it's paid for, a guide takes it, and the
	 * trip runs. Each source contributes its own events; the merge sorts by time.
	 */
	private buildActivity(
		bookings: TouristBooking[],
		trips: TouristTrip[],
		reviews: ReviewRow[],
		invoices: InvoiceRow[]
	): ActivityEntry[] {
		const entries: ActivityEntry[] = [];

		for (const booking of bookings) {
			entries.push({
				id: `booking-${booking._id}`,
				type: 'booking-created',
				title: 'Booking created',
				description: `${booking.travel_details.city} · ${booking.bookingCode ?? 'Pending code'}`,
				at: new Date(booking.createdAt),
				href: `/dashboard/user/my-bookings/${booking._id}`,
			});
		}

		for (const invoice of invoices) {
			entries.push({
				id: `payment-${invoice._id.toString()}`,
				type: 'payment-successful',
				title: 'Payment successful',
				description: `${invoice.paymentInfo?.currency ?? 'INR'} ${(
					invoice.paymentInfo?.grandTotal ?? 0
				).toLocaleString('en-IN')} · ${invoice.invoiceNumber}`,
				at: new Date(invoice.paymentDate ?? invoice.invoiceDate),
			});
		}

		for (const trip of trips) {
			const guide = this.asGuide(trip.guide);
			// A synthetic 'planned' entry is just the booking again — it has no guide
			// and no trip events of its own, so it contributes nothing here.
			if (!guide) continue;

			entries.push({
				id: `assigned-${trip._id.toString()}`,
				type: 'guide-assigned',
				title: 'Guide assigned',
				description: `${guide.name} will guide you in ${trip.booking.travel_details.city}`,
				at: new Date(trip.createdAt),
				href: '/dashboard/user/trips',
			});

			if (trip.status === 'in-progress' || trip.status === 'completed') {
				const started = trip.startedAt ?? trip.updatedAt;
				entries.push({
					id: `trip-started-${trip._id.toString()}`,
					type: 'trip-updated',
					title: 'Trip started',
					description: `Your trip to ${trip.booking.travel_details.city} is under way`,
					at: new Date(started),
					href: '/dashboard/user/trips',
				});
			}

			if (trip.status === 'completed') {
				entries.push({
					id: `trip-completed-${trip._id.toString()}`,
					type: 'trip-updated',
					title: 'Trip completed',
					description: `${trip.booking.travel_details.city} — hope you enjoyed it!`,
					at: new Date(trip.completedAt ?? trip.updatedAt),
					href: '/dashboard/user/trips',
				});
			}
		}

		for (const review of reviews) {
			entries.push({
				id: `review-${review._id.toString()}`,
				type: 'review-submitted',
				title: 'Review submitted',
				description: `You rated your guide ${review.rating}/5`,
				at: new Date(review.createdAt),
				href: '/dashboard/user/reviews',
			});
		}

		return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, RECENT_ACTIVITY);
	}

	/** Percentage of the onboarding profile the tourist has actually filled in. */
	private profileCompletion(profile: TouristProfileShape) {
		const filled = PROFILE_FIELDS.filter((field) => field.filled(profile)).length;
		return Math.round((filled / PROFILE_FIELDS.length) * 100);
	}

	/**
	 * A trip's `guide` is populated when a guide has accepted, and null on a
	 * synthetic 'planned' entry. Narrow it to the populated shape or null.
	 */
	private asGuide(guide: TouristTrip['guide']): PopulatedGuide | null {
		if (!guide || typeof guide !== 'object' || !('name' in guide)) return null;
		return guide as PopulatedGuide;
	}
}

interface PopulatedGuide {
	_id: Types.ObjectId;
	name: string;
	email: string;
	phone?: string;
}

interface TouristTrip {
	_id: Types.ObjectId | string;
	tripCode?: string;
	status: 'planned' | 'not-started' | 'in-progress' | 'completed' | 'cancelled';
	guide: PopulatedGuide | Types.ObjectId | null;
	booking: {
		_id: Types.ObjectId;
		bookingCode?: string;
		status: string;
		travel_details: { city: string; places: string[]; date: Date; no_of_person: number };
	};
	startedAt?: Date;
	completedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

type TouristBooking = Awaited<ReturnType<typeof BookingService.getMyBookings>>[number];

interface InvoiceRow {
	_id: Types.ObjectId;
	invoiceNumber: string;
	invoiceDate: Date;
	paymentDate: Date;
	paymentInfo?: { grandTotal?: number; currency?: string };
	bookingSnapshot?: { destination?: string };
}

interface ReviewRow {
	_id: Types.ObjectId;
	booking?: Types.ObjectId;
	rating: number;
	createdAt: Date;
}

export default new TouristDashboardService();
