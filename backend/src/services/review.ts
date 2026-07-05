import { BookingDB, ReviewDB } from '@mongo';
import { Types } from 'mongoose';
import { ConflictError, ForbiddenError, NotFoundError } from 'node-be-utilities';
import ActivityLogService from './activityLog';
import NotificationService from './notification';

interface PageParams {
	page?: number;
	limit?: number;
}

class ReviewService {
	async createReview(params: { bookingId: string; touristUserId: string; rating: number; comment?: string }) {
		const { bookingId, touristUserId, rating, comment } = params;

		const booking = await BookingDB.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}
		if (booking.linked_to?.toString() !== touristUserId) {
			throw new ForbiddenError('This booking does not belong to you');
		}
		if (booking.status !== 'completed') {
			throw new ConflictError('You can only review a completed trip');
		}
		if (!booking.allocated_guide) {
			throw new ConflictError('This booking has no allocated guide to review');
		}

		const existing = await ReviewDB.findOne({ booking: bookingId });
		if (existing) {
			throw new ConflictError('You have already reviewed this booking');
		}

		const review = await ReviewDB.create({
			booking: bookingId,
			guide: booking.allocated_guide,
			tourist: touristUserId,
			rating,
			comment,
		});

		await ActivityLogService.log({
			actor: touristUserId,
			action: 'review.created',
			targetType: 'Review',
			targetId: review._id.toString(),
			description: `Tourist left a ${rating}-star review for booking ${bookingId}`,
		});

		await NotificationService.create({
			recipient: booking.allocated_guide,
			type: 'review_received',
			title: 'New Review Received',
			message: `You received a ${rating}-star review.`,
			relatedEntity: { kind: 'Review', id: review._id.toString() },
			dedupeKey: `review_received:${review._id.toString()}`,
		});

		return review;
	}

	/**
	 * Public, unauthenticated aggregate for a guide's reviews. Computed live
	 * from Review — never persisted onto the Guide model.
	 */
	async getPublicGuideReviews(guideId: string, limit = 50) {
		const query = { guide: guideId, isHidden: false };
		const [reviews, aggregate] = await Promise.all([
			ReviewDB.find(query)
				.select('rating comment createdAt tourist')
				.populate('tourist', 'name')
				.sort({ createdAt: -1 })
				.limit(limit)
				.lean(),
			ReviewDB.aggregate([
				{ $match: { guide: new Types.ObjectId(guideId), isHidden: false } },
				{ $group: { _id: '$guide', average: { $avg: '$rating' }, total: { $sum: 1 } } },
			]),
		]);

		return {
			reviews,
			average: aggregate[0]?.average ?? 0,
			total: aggregate[0]?.total ?? 0,
		};
	}

	async getGuideReviews(guideId: string, { page = 1, limit = 20 }: PageParams = {}) {
		const query = { guide: guideId, isHidden: false };
		const skip = (page - 1) * limit;
		const [data, total, aggregate] = await Promise.all([
			ReviewDB.find(query).populate('tourist', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			ReviewDB.countDocuments(query),
			ReviewDB.aggregate([
				{ $match: { guide: new Types.ObjectId(guideId), isHidden: false } },
				{ $group: { _id: '$guide', average: { $avg: '$rating' }, total: { $sum: 1 } } },
			]),
		]);

		return {
			data,
			total,
			page,
			totalPages: Math.ceil(total / limit) || 1,
			average: aggregate[0]?.average ?? 0,
			ratingTotal: aggregate[0]?.total ?? 0,
		};
	}

	async getMineAsGuide(guideUserId: string, params: PageParams = {}) {
		return this.getGuideReviews(guideUserId, params);
	}

	async getMyReviews(touristUserId: string, { page = 1, limit = 20 }: PageParams = {}) {
		const query = { tourist: touristUserId };
		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			ReviewDB.find(query).populate('guide', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			ReviewDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getAllForAdmin(
		filters: { guideId?: string; minRating?: number; isHidden?: boolean } = {},
		{ page = 1, limit = 20 }: PageParams = {}
	) {
		const query: Record<string, unknown> = {};
		if (filters.guideId) query.guide = filters.guideId;
		if (filters.minRating) query.rating = { $gte: filters.minRating };
		if (filters.isHidden !== undefined) query.isHidden = filters.isHidden;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			ReviewDB.find(query)
				.populate('guide', 'name email')
				.populate('tourist', 'name email')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			ReviewDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async setHidden(reviewId: Types.ObjectId, isHidden: boolean, adminUserId: string) {
		const review = await ReviewDB.findByIdAndUpdate(
			reviewId,
			{ isHidden, moderatedBy: adminUserId, moderatedAt: new Date() },
			{ new: true }
		);
		if (!review) {
			throw new NotFoundError('Review not found');
		}

		await ActivityLogService.log({
			actor: adminUserId,
			action: isHidden ? 'review.hidden' : 'review.unhidden',
			targetType: 'Review',
			targetId: review._id.toString(),
			description: `Admin ${isHidden ? 'hid' : 'unhid'} a review`,
		});

		return review;
	}

	async deleteReview(reviewId: Types.ObjectId, adminUserId: string) {
		const review = await ReviewDB.findByIdAndDelete(reviewId);
		if (!review) {
			throw new NotFoundError('Review not found');
		}

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'review.deleted',
			targetType: 'Review',
			targetId: reviewId.toString(),
			description: 'Admin deleted a review',
		});

		return { message: 'Review deleted successfully' };
	}
}

export default new ReviewService();
