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
import ActivityLogService from './activityLog';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface PageParams {
	page?: number;
	limit?: number;
}

class ReportService {
	/**
	 * Pure read-only aggregation over Assignment/Trip/Review (new) and
	 * Booking/Transaction/Guide/Tourist (existing, never written to here).
	 */
	async getOverview() {
		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

		const [
			totalBookings,
			revenueAgg,
			activeGuides,
			activeTourists,
			pendingAssignments,
			totalTrips,
			completedTrips,
			cancelledTrips,
			membershipRenewals,
			ratingAgg,
		] = await Promise.all([
			BookingDB.countDocuments({}),
			TransactionDB.aggregate([
				{ $match: { status: { $in: ['success', 'paid'] } } },
				{ $group: { _id: null, total: { $sum: '$amount' } } },
			]),
			GuideDB.countDocuments({ isVisible: true, membershipExpiryDate: { $gte: now } }),
			TouristDB.countDocuments({ registrationCompleted: true }),
			AssignmentDB.countDocuments({ status: 'pending' }),
			TripDB.countDocuments({}),
			TripDB.countDocuments({ status: 'completed' }),
			TripDB.countDocuments({ status: 'cancelled' }),
			TransactionDB.countDocuments({
				reference_type: 'guide_membership',
				status: { $in: ['success', 'paid'] },
				updatedAt: { $gte: thirtyDaysAgo },
			}),
			ReviewDB.aggregate([
				{ $match: { isHidden: false } },
				{ $group: { _id: null, average: { $avg: '$rating' }, total: { $sum: 1 } } },
			]),
		]);

		return {
			totalBookings,
			totalRevenue: revenueAgg[0]?.total ?? 0,
			activeGuides,
			activeTourists,
			pendingAssignments,
			totalTrips,
			completedTrips,
			cancelledTrips,
			membershipRenewals,
			avgRating: ratingAgg[0]?.average ?? 0,
			totalReviews: ratingAgg[0]?.total ?? 0,
		};
	}

	async getBookingsTrend(range: '7d' | '30d' | '90d' = '30d') {
		const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
		const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		const [bookingsByDay, revenueByDay] = await Promise.all([
			BookingDB.aggregate([
				{ $match: { createdAt: { $gte: since } } },
				{
					$group: {
						_id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
						bookings: { $sum: 1 },
					},
				},
				{ $sort: { _id: 1 } },
			]),
			TransactionDB.aggregate([
				{
					$match: {
						status: { $in: ['success', 'paid'] },
						updatedAt: { $gte: since },
					},
				},
				{
					$group: {
						_id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
						revenue: { $sum: '$amount' },
					},
				},
				{ $sort: { _id: 1 } },
			]),
		]);

		const revenueByDate = new Map(revenueByDay.map((r) => [r._id, r.revenue]));
		const bookingsByDate = new Map(bookingsByDay.map((b) => [b._id, b.bookings]));
		const allDates = new Set([...revenueByDate.keys(), ...bookingsByDate.keys()]);

		return Array.from(allDates)
			.sort()
			.map((date) => ({
				date,
				bookings: bookingsByDate.get(date) ?? 0,
				revenue: revenueByDate.get(date) ?? 0,
			}));
	}

	async getGuidePerformance(limit = 10) {
		const [assignmentCounts, tripCounts, ratingAggs] = await Promise.all([
			AssignmentDB.aggregate([{ $group: { _id: '$guide', assignmentsCount: { $sum: 1 } } }]),
			TripDB.aggregate([
				{ $match: { status: 'completed' } },
				{ $group: { _id: '$guide', tripsCompleted: { $sum: 1 } } },
			]),
			ReviewDB.aggregate([
				{ $match: { isHidden: false } },
				{ $group: { _id: '$guide', avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
			]),
		]);

		const assignmentsByGuide = new Map(assignmentCounts.map((a) => [a._id.toString(), a.assignmentsCount]));
		const tripsByGuide = new Map(tripCounts.map((t) => [t._id.toString(), t.tripsCompleted]));
		const ratingByGuide = new Map(ratingAggs.map((r) => [r._id.toString(), r]));

		const guideIds = new Set([
			...assignmentsByGuide.keys(),
			...tripsByGuide.keys(),
			...ratingByGuide.keys(),
		]);

		const accounts = await AccountDB.find({ _id: { $in: Array.from(guideIds) } })
			.select('name email')
			.lean();
		const accountById = new Map(accounts.map((a) => [a._id.toString(), a]));

		const rows = Array.from(guideIds).map((guideId) => {
			const rating = ratingByGuide.get(guideId);
			return {
				guideId,
				name: accountById.get(guideId)?.name ?? 'Unknown',
				email: accountById.get(guideId)?.email ?? '',
				assignmentsCount: assignmentsByGuide.get(guideId) ?? 0,
				tripsCompleted: tripsByGuide.get(guideId) ?? 0,
				avgRating: rating?.avgRating ?? 0,
				totalReviews: rating?.totalReviews ?? 0,
			};
		});

		return rows.sort((a, b) => b.tripsCompleted - a.tripsCompleted).slice(0, limit);
	}

	async getActivityLog(
		filters: { action?: string; actorType?: 'user' | 'system'; from?: string; to?: string } = {},
		params: PageParams = {}
	) {
		return ActivityLogService.getAll(filters, params);
	}
}

export default new ReportService();
