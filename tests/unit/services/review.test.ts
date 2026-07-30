import { AccountDB, BookingDB, ReviewDB } from '@mongo';
import ReviewService from '@services/review';
import { Types } from 'mongoose';
import { ConflictError, ForbiddenError, NotFoundError } from 'node-be-utilities';
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
			places: ['City Palace'],
			city: 'Udaipur',
			date: new Date('2026-11-01'),
			no_of_person: 2,
			preferences: { hotel: true, taxi: false },
		},
		guide_preferences: {
			guide_language: ['English'],
			gender: 'none' as const,
		},
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

describe('ReviewService', () => {
	let touristId: Types.ObjectId;
	let otherTouristId: Types.ObjectId;
	let guideId: Types.ObjectId;

	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();

		const tourist = await AccountDB.create({
			name: 'Jane Doe',
			email: 'jane@example.com',
			phone: '+1000000000',
			password: 'password123',
			role: 'tourist',
		});
		touristId = tourist._id;

		const otherTourist = await AccountDB.create({
			name: 'Other Tourist',
			email: 'other@example.com',
			phone: '+1000000004',
			password: 'password123',
			role: 'tourist',
		});
		otherTouristId = otherTourist._id;

		const guide = await AccountDB.create({
			name: 'Guide One',
			email: 'guide1@example.com',
			phone: '+1000000001',
			password: 'password123',
			role: 'guide',
		});
		guideId = guide._id;
	});

	describe('createReview', () => {
		it('creates a review for a completed booking with an allocated guide', async () => {
			const booking = await BookingDB.create(
				bookingFixture({ linked_to: touristId, allocated_guide: guideId })
			);

			const review = await ReviewService.createReview({
				bookingId: booking._id.toString(),
				touristUserId: touristId.toString(),
				rating: 5,
				comment: 'Fantastic guide!',
			});

			expect(review.rating).toBe(5);
			expect(review.guide.toString()).toBe(guideId.toString());
			expect(review.tourist.toString()).toBe(touristId.toString());
		});

		it('throws ForbiddenError if the booking does not belong to the tourist', async () => {
			const booking = await BookingDB.create(
				bookingFixture({ linked_to: touristId, allocated_guide: guideId })
			);

			await expect(
				ReviewService.createReview({
					bookingId: booking._id.toString(),
					touristUserId: otherTouristId.toString(),
					rating: 4,
				})
			).rejects.toThrow(ForbiddenError);
		});

		it('throws ConflictError if the booking is not completed yet', async () => {
			const booking = await BookingDB.create(
				bookingFixture({ linked_to: touristId, allocated_guide: guideId, status: 'allocated' })
			);

			await expect(
				ReviewService.createReview({
					bookingId: booking._id.toString(),
					touristUserId: touristId.toString(),
					rating: 4,
				})
			).rejects.toThrow(ConflictError);
		});

		it('throws ConflictError if the booking has no allocated guide', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));

			await expect(
				ReviewService.createReview({
					bookingId: booking._id.toString(),
					touristUserId: touristId.toString(),
					rating: 4,
				})
			).rejects.toThrow(ConflictError);
		});

		it('throws ConflictError on a duplicate review for the same booking', async () => {
			const booking = await BookingDB.create(
				bookingFixture({ linked_to: touristId, allocated_guide: guideId })
			);

			await ReviewService.createReview({
				bookingId: booking._id.toString(),
				touristUserId: touristId.toString(),
				rating: 5,
			});

			await expect(
				ReviewService.createReview({
					bookingId: booking._id.toString(),
					touristUserId: touristId.toString(),
					rating: 3,
				})
			).rejects.toThrow(ConflictError);
		});
	});

	describe('getPublicGuideReviews', () => {
		it('computes the live average/total and excludes hidden reviews', async () => {
			const bookingA = await BookingDB.create(
				bookingFixture({ linked_to: touristId, allocated_guide: guideId, transaction_id: 'txn-a' })
			);
			const bookingB = await BookingDB.create(
				bookingFixture({
					linked_to: otherTouristId,
					allocated_guide: guideId,
					transaction_id: 'txn-b',
				})
			);

			await ReviewDB.create({ booking: bookingA._id, guide: guideId, tourist: touristId, rating: 4 });
			await ReviewDB.create({
				booking: bookingB._id,
				guide: guideId,
				tourist: otherTouristId,
				rating: 2,
				isHidden: true,
			});

			const result = await ReviewService.getPublicGuideReviews(guideId.toString());

			expect(result.total).toBe(1);
			expect(result.average).toBe(4);
			expect(result.reviews).toHaveLength(1);
		});
	});

	describe('setHidden / deleteReview', () => {
		it('hides a review and records the moderator', async () => {
			const booking = await BookingDB.create(
				bookingFixture({ linked_to: touristId, allocated_guide: guideId })
			);
			const review = await ReviewDB.create({
				booking: booking._id,
				guide: guideId,
				tourist: touristId,
				rating: 3,
			});
			const admin = await AccountDB.create({
				name: 'Admin',
				email: 'admin@example.com',
				phone: '+1000000009',
				password: 'password123',
				role: 'admin',
			});

			const hidden = await ReviewService.setHidden(review._id, true, admin._id.toString());

			expect(hidden.isHidden).toBe(true);
			expect(hidden.moderatedBy?.toString()).toBe(admin._id.toString());
		});

		it('throws NotFoundError when hiding a review that does not exist', async () => {
			await expect(
				ReviewService.setHidden(new Types.ObjectId(), true, touristId.toString())
			).rejects.toThrow(NotFoundError);
		});

		it('deletes a review', async () => {
			const booking = await BookingDB.create(
				bookingFixture({ linked_to: touristId, allocated_guide: guideId })
			);
			const review = await ReviewDB.create({
				booking: booking._id,
				guide: guideId,
				tourist: touristId,
				rating: 3,
			});

			await ReviewService.deleteReview(review._id, touristId.toString());

			expect(await ReviewDB.findById(review._id)).toBeNull();
		});
	});
});
