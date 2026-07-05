import { AccountDB, AssignmentDB, BookingDB, TripDB } from '@mongo';
import { Types } from 'mongoose';
import { ConflictError, ForbiddenError, NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

jest.mock('@provider/email', () => ({
	sendTripStartedEmail: jest.fn().mockResolvedValue(true),
	sendTripCompletedEmail: jest.fn().mockResolvedValue(true),
}));

import { sendTripCompletedEmail, sendTripStartedEmail } from '@provider/email';
import TripService from '@services/trip';

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
			places: ['Amber Fort'],
			city: 'Jaipur',
			date: new Date('2026-12-25'),
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
		status: 'allocated' as const,
		...overrides,
	};
}

describe('TripService', () => {
	let touristId: Types.ObjectId;
	let guideId: Types.ObjectId;
	let otherGuideId: Types.ObjectId;
	let adminId: Types.ObjectId;

	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();
		(sendTripStartedEmail as jest.Mock).mockResolvedValue(true);
		(sendTripCompletedEmail as jest.Mock).mockResolvedValue(true);

		const tourist = await AccountDB.create({
			name: 'Jane Doe',
			email: 'jane@example.com',
			phone: '+1000000000',
			password: 'password123',
			role: 'tourist',
		});
		touristId = tourist._id;

		const guide = await AccountDB.create({
			name: 'Guide One',
			email: 'guide1@example.com',
			phone: '+1000000001',
			password: 'password123',
			role: 'guide',
		});
		guideId = guide._id;

		const otherGuide = await AccountDB.create({
			name: 'Guide Two',
			email: 'guide2@example.com',
			phone: '+1000000002',
			password: 'password123',
			role: 'guide',
		});
		otherGuideId = otherGuide._id;

		const admin = await AccountDB.create({
			name: 'Admin',
			email: 'admin@example.com',
			phone: '+1000000003',
			password: 'password123',
			role: 'admin',
		});
		adminId = admin._id;
	});

	async function createBookingAssignmentTrip() {
		const booking = await BookingDB.create(
			bookingFixture({ linked_to: touristId, allocated_guide: guideId })
		);
		const assignment = await AssignmentDB.create({
			booking: booking._id,
			guide: guideId,
			assignedBy: adminId,
			status: 'accepted',
			respondedAt: new Date(),
		});
		const trip = await TripService.createFromAssignment(assignment);
		return { booking, assignment, trip };
	}

	describe('createFromAssignment', () => {
		it('creates a not-started trip tied to the booking and assignment', async () => {
			const { booking, assignment, trip } = await createBookingAssignmentTrip();

			expect(trip.status).toBe('not-started');
			expect(trip.booking.toString()).toBe(booking._id.toString());
			expect(trip.assignment.toString()).toBe(assignment._id.toString());
			expect(trip.guide.toString()).toBe(guideId.toString());
		});

		it('is idempotent — calling it again for the same booking returns the existing trip', async () => {
			const { assignment, trip } = await createBookingAssignmentTrip();

			const second = await TripService.createFromAssignment(assignment);

			expect(second._id.toString()).toBe(trip._id.toString());
			expect(await TripDB.countDocuments({ booking: trip.booking })).toBe(1);
		});
	});

	describe('start', () => {
		it('transitions a trip from not-started to in-progress', async () => {
			const { trip } = await createBookingAssignmentTrip();

			const started = await TripService.start(trip._id, guideId.toString(), 'On our way');

			expect(started.status).toBe('in-progress');
			expect(started.startedAt).toBeTruthy();
			expect(started.startNotes).toBe('On our way');
			expect(sendTripStartedEmail).toHaveBeenCalled();
		});

		it('throws ForbiddenError if a different guide tries to start it', async () => {
			const { trip } = await createBookingAssignmentTrip();

			await expect(TripService.start(trip._id, otherGuideId.toString())).rejects.toThrow(
				ForbiddenError
			);
		});

		it('throws ConflictError if the trip was already started', async () => {
			const { trip } = await createBookingAssignmentTrip();
			await TripService.start(trip._id, guideId.toString());

			await expect(TripService.start(trip._id, guideId.toString())).rejects.toThrow(
				ConflictError
			);
		});

		it('throws NotFoundError for an unknown trip id', async () => {
			await expect(
				TripService.start(new Types.ObjectId(), guideId.toString())
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('complete', () => {
		it('transitions in-progress to completed and flips the booking to completed', async () => {
			const { booking, trip } = await createBookingAssignmentTrip();
			await TripService.start(trip._id, guideId.toString());

			const completed = await TripService.complete(trip._id, guideId.toString(), 'Great trip');

			expect(completed.status).toBe('completed');
			expect(completed.completedAt).toBeTruthy();
			expect(completed.completionNotes).toBe('Great trip');
			expect(sendTripCompletedEmail).toHaveBeenCalled();

			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.status).toBe('completed');
		});

		it('throws ConflictError if the trip has not been started yet', async () => {
			const { trip } = await createBookingAssignmentTrip();

			await expect(TripService.complete(trip._id, guideId.toString())).rejects.toThrow(
				ConflictError
			);
		});
	});

	describe('cancel', () => {
		it('cancels a not-started trip', async () => {
			const { trip } = await createBookingAssignmentTrip();

			const cancelled = await TripService.cancel(trip._id, adminId.toString(), 'Guide unavailable');

			expect(cancelled.status).toBe('cancelled');
			expect(cancelled.completionNotes).toBe('Guide unavailable');
		});

		it('throws ConflictError if the trip is already completed', async () => {
			const { trip } = await createBookingAssignmentTrip();
			await TripService.start(trip._id, guideId.toString());
			await TripService.complete(trip._id, guideId.toString());

			await expect(TripService.cancel(trip._id, adminId.toString())).rejects.toThrow(
				ConflictError
			);
		});
	});

	describe('getById', () => {
		it('allows the admin to view any trip', async () => {
			const { trip } = await createBookingAssignmentTrip();

			const found = await TripService.getById(trip._id, {
				userId: adminId.toString(),
				role: 'admin',
				email: 'admin@example.com',
				name: 'Admin',
				tokenVersion: 0,
			});

			expect(found._id.toString()).toBe(trip._id.toString());
		});

		it('allows the owning guide to view the trip', async () => {
			const { trip } = await createBookingAssignmentTrip();

			const found = await TripService.getById(trip._id, {
				userId: guideId.toString(),
				role: 'guide',
				email: 'guide1@example.com',
				name: 'Guide One',
				tokenVersion: 0,
			});

			expect(found._id.toString()).toBe(trip._id.toString());
		});

		it('allows the booking tourist to view the trip', async () => {
			const { trip } = await createBookingAssignmentTrip();

			const found = await TripService.getById(trip._id, {
				userId: touristId.toString(),
				role: 'tourist',
				email: 'jane@example.com',
				name: 'Jane Doe',
				tokenVersion: 0,
			});

			expect(found._id.toString()).toBe(trip._id.toString());
		});

		it('forbids an unrelated guide from viewing the trip', async () => {
			const { trip } = await createBookingAssignmentTrip();

			await expect(
				TripService.getById(trip._id, {
					userId: otherGuideId.toString(),
					role: 'guide',
					email: 'guide2@example.com',
					name: 'Guide Two',
					tokenVersion: 0,
				})
			).rejects.toThrow(ForbiddenError);
		});
	});
});
