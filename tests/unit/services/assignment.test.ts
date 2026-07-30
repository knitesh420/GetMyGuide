import { AccountDB, AssignmentDB, BookingDB, GuideDB, TripDB } from '@mongo';
import { Types } from 'mongoose';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

// Email is stubbed globally in tests/setup/mocks.ts — every export resolves to
// an async no-op, which is all this suite needs (it asserts on database state,
// never on a send).
//
// This file used to declare its own jest.mock returning
// `jest.fn().mockResolvedValue(true)`. jest.config sets `resetMocks: true`,
// which blanks a jest.fn's implementation before every test, so those senders
// returned `undefined` by the time the service called them and booking.ts threw
// "Failed to send email to tourist" on every allocation. The global stub uses
// plain functions precisely so a reset cannot strip it.

import AssignmentService from '@services/assignment';

function bookingFixture(overrides: Partial<Record<string, any>> = {}) {
	return {
		tourist_info: {
			name: 'John Doe',
			gender: 'male' as const,
			phone: '+1234567890',
			email: 'john@example.com',
			country: 'USA',
		},
		travel_details: {
			places: ['Taj Mahal'],
			city: 'Agra',
			date: new Date('2026-12-25'),
			no_of_person: 2,
			preferences: { hotel: true, taxi: false },
		},
		guide_preferences: {
			guide_language: ['English'],
			gender: 'male' as const,
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
		status: 'successful' as const,
		...overrides,
	};
}

describe('AssignmentService', () => {
	let touristId: Types.ObjectId;
	let guideAccountId: Types.ObjectId;
	let otherGuideAccountId: Types.ObjectId;
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

		const tourist = await AccountDB.create({
			name: 'Tourist',
			email: 'tourist@example.com',
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
		guideAccountId = guide._id;

		const otherGuide = await AccountDB.create({
			name: 'Guide Two',
			email: 'guide2@example.com',
			phone: '+1000000002',
			password: 'password123',
			role: 'guide',
		});
		otherGuideAccountId = otherGuide._id;

		const admin = await AccountDB.create({
			name: 'Admin',
			email: 'admin@example.com',
			phone: '+1000000003',
			password: 'password123',
			role: 'admin',
		});
		adminId = admin._id;
	});

	describe('createAssignment', () => {
		it('creates a pending assignment and allocates the guide on the booking', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));

			const assignment = await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: guideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			expect(assignment.status).toBe('pending');
			expect(assignment.guide.toString()).toBe(guideAccountId.toString());
			expect(assignment.assignedBy.toString()).toBe(adminId.toString());

			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.status).toBe('allocated');
			expect(updatedBooking?.allocated_guide?.toString()).toBe(guideAccountId.toString());
		});

		it('throws ConflictError if the booking already has an active assignment', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));

			await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: guideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			await expect(
				AssignmentService.createAssignment({
					bookingId: booking._id.toString(),
					guideId: otherGuideAccountId.toString(),
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(ConflictError);
		});

		it('throws NotFoundError if the booking does not exist', async () => {
			await expect(
				AssignmentService.createAssignment({
					bookingId: new Types.ObjectId().toString(),
					guideId: guideAccountId.toString(),
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(NotFoundError);
		});

		it('throws BadRequestError if the target account is not a guide', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));

			await expect(
				AssignmentService.createAssignment({
					bookingId: booking._id.toString(),
					guideId: touristId.toString(),
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('respond', () => {
		it('accepts an assignment and auto-creates a trip', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));
			const assignment = await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: guideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			const result = await AssignmentService.respond({
				assignmentId: assignment._id,
				guideUserId: guideAccountId.toString(),
				action: 'accept',
			});

			expect(result.assignment.status).toBe('accepted');
			expect(result.trip).toBeTruthy();

			const trip = await TripDB.findOne({ booking: booking._id });
			expect(trip).toBeTruthy();
			expect(trip?.guide.toString()).toBe(guideAccountId.toString());
			expect(trip?.status).toBe('not-started');
		});

		it('throws ForbiddenError if a different guide tries to respond', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));
			const assignment = await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: guideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			await expect(
				AssignmentService.respond({
					assignmentId: assignment._id,
					guideUserId: otherGuideAccountId.toString(),
					action: 'accept',
				})
			).rejects.toThrow(ForbiddenError);
		});

		it('declines an assignment, requires a reason, and reverts the booking', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));
			const assignment = await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: guideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			await expect(
				AssignmentService.respond({
					assignmentId: assignment._id,
					guideUserId: guideAccountId.toString(),
					action: 'decline',
				})
			).rejects.toThrow(BadRequestError);

			const result = await AssignmentService.respond({
				assignmentId: assignment._id,
				guideUserId: guideAccountId.toString(),
				action: 'decline',
				declineReason: 'Not available on these dates',
			});

			expect(result.assignment.status).toBe('declined');
			expect(result.trip).toBeNull();

			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.status).toBe('successful');
			expect(updatedBooking?.allocated_guide).toBeUndefined();
		});

		it('throws ConflictError when responding to an already-resolved assignment', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));
			const assignment = await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: guideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			await AssignmentService.respond({
				assignmentId: assignment._id,
				guideUserId: guideAccountId.toString(),
				action: 'accept',
			});

			await expect(
				AssignmentService.respond({
					assignmentId: assignment._id,
					guideUserId: guideAccountId.toString(),
					action: 'accept',
				})
			).rejects.toThrow(ConflictError);
		});
	});

	describe('reassignGuide', () => {
		it('reassigns a pending assignment to a new guide and keeps the booking allocated', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));
			const original = await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: guideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			const reassigned = await AssignmentService.reassignGuide({
				currentAssignmentId: original._id,
				newGuideId: otherGuideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			expect(reassigned.status).toBe('pending');
			expect(reassigned.guide.toString()).toBe(otherGuideAccountId.toString());
			expect(reassigned.previousAssignment?.toString()).toBe(original._id.toString());

			const oldAssignment = await AssignmentDB.findById(original._id);
			expect(oldAssignment?.status).toBe('reassigned');

			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.status).toBe('allocated');
			expect(updatedBooking?.allocated_guide?.toString()).toBe(otherGuideAccountId.toString());
		});

		it('throws ConflictError if the current assignment was already accepted', async () => {
			const booking = await BookingDB.create(bookingFixture({ linked_to: touristId }));
			const assignment = await AssignmentService.createAssignment({
				bookingId: booking._id.toString(),
				guideId: guideAccountId.toString(),
				adminUserId: adminId.toString(),
			});

			await AssignmentService.respond({
				assignmentId: assignment._id,
				guideUserId: guideAccountId.toString(),
				action: 'accept',
			});

			await expect(
				AssignmentService.reassignGuide({
					currentAssignmentId: assignment._id,
					newGuideId: otherGuideAccountId.toString(),
					adminUserId: adminId.toString(),
				})
			).rejects.toThrow(ConflictError);
		});
	});

	describe('getAssignableGuides', () => {
		it('merges Account and Guide profile fields for every active guide account', async () => {
			await GuideDB.create({
				accountId: guideAccountId,
				city: 'Jaipur',
				languages: ['English', 'Hindi'],
				isVisible: true,
				membershipExpiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
			});

			const guides = await AssignmentService.getAssignableGuides();

			expect(guides).toHaveLength(2);
			const enriched = guides.find((g) => g.accountId === guideAccountId.toString());
			expect(enriched?.city).toBe('Jaipur');
			expect(enriched?.languages).toEqual(['English', 'Hindi']);
			expect(enriched?.isVisible).toBe(true);

			const withoutProfile = guides.find((g) => g.accountId === otherGuideAccountId.toString());
			expect(withoutProfile?.city).toBe('');
			expect(withoutProfile?.isVisible).toBe(false);
		});
	});
});
