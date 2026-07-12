import {
	AssignmentDB,
	BookingDB,
	GuideDB,
	MessageDB,
	NotificationDB,
	RefundRequestDB,
	ReviewDB,
	TripDB,
} from '@mongo';
import { JWTPayload } from '@services/jwt';
import { Types } from 'mongoose';
import EarningService from './earning';
import ReportService from './report';

/**
 * One endpoint, three answers. `GET /dashboard/stats` is called from a shared
 * frontend hook that does not know (or want to know) the caller's role, so the
 * shape is chosen here from the session rather than by the client picking a URL.
 */
class DashboardService {
	async getStats(user: JWTPayload) {
		switch (user.role) {
			case 'admin':
				return this.adminStats();
			case 'guide':
				return this.guideStats(user.userId);
			default:
				return this.touristStats(user.userId);
		}
	}

	private async adminStats() {
		const [overview, pendingRefunds, pendingApprovals, payoutQueue] = await Promise.all([
			ReportService.getOverview(),
			RefundRequestDB.countDocuments({ status: 'pending' }),
			GuideDB.countDocuments({
				registrationCompleted: true,
				$or: [
					{ approvalStatus: 'pending' },
					{ approvalStatus: { $exists: false }, isVisible: false },
				],
			}),
			EarningService.getPayoutQueue(),
		]);

		return {
			role: 'admin' as const,
			...overview,
			// The four things an admin actually has to act on.
			pendingRefunds,
			pendingApprovals,
			pendingPayouts: payoutQueue.length,
			pendingPayoutAmount: payoutQueue.reduce((sum, row) => sum + row.amount, 0),
		};
	}

	private async guideStats(guideUserId: string) {
		const id = new Types.ObjectId(guideUserId);

		const [
			pendingAssignments,
			upcomingTrips,
			completedTrips,
			earnings,
			ratingAgg,
			unreadNotifications,
			unreadMessages,
		] = await Promise.all([
			AssignmentDB.countDocuments({ guide: id, status: 'pending' }),
			TripDB.countDocuments({ guide: id, status: { $in: ['not-started', 'in-progress'] } }),
			TripDB.countDocuments({ guide: id, status: 'completed' }),
			EarningService.summaryFor(guideUserId),
			ReviewDB.aggregate([
				{ $match: { guide: id, isHidden: false } },
				{ $group: { _id: null, average: { $avg: '$rating' }, total: { $sum: 1 } } },
			]),
			NotificationDB.countDocuments({ recipient: id, isRead: false }),
			MessageDB.countDocuments({ sender: { $ne: id }, readBy: { $ne: id } }),
		]);

		return {
			role: 'guide' as const,
			pendingAssignments,
			upcomingTrips,
			completedTrips,
			earnings,
			avgRating: ratingAgg[0]?.average ?? 0,
			totalReviews: ratingAgg[0]?.total ?? 0,
			unreadNotifications,
			unreadMessages,
		};
	}

	private async touristStats(touristUserId: string) {
		const id = new Types.ObjectId(touristUserId);

		const [totalBookings, upcomingTrips, completedTrips, balanceAgg, unreadNotifications] =
			await Promise.all([
				BookingDB.countDocuments({ linked_to: id }),
				BookingDB.countDocuments({
					linked_to: id,
					status: { $in: ['confirmed', 'allocated', 'successful'] },
					'travel_details.date': { $gte: new Date() },
				}),
				BookingDB.countDocuments({ linked_to: id, status: 'completed' }),
				BookingDB.aggregate([
					{ $match: { linked_to: id, status: { $ne: 'cancelled' }, balance_due: { $gt: 0 } } },
					{ $group: { _id: null, total: { $sum: '$balance_due' } } },
				]),
				NotificationDB.countDocuments({ recipient: id, isRead: false }),
			]);

		return {
			role: 'tourist' as const,
			totalBookings,
			upcomingTrips,
			completedTrips,
			// What they still owe across every live booking — the thing most worth surfacing.
			outstandingBalance: balanceAgg[0]?.total ?? 0,
			unreadNotifications,
		};
	}
}

export default new DashboardService();
