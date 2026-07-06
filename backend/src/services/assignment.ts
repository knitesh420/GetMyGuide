import { AccountDB, AssignmentDB, BookingDB, GuideDB } from '@mongo';
import IBooking from '@mongo/types/booking';
import {
	sendBookingAllocatedGuideEmail,
	sendBookingAllocatedTouristEmail,
	sendGuideAcceptedEmail,
	sendGuideAssignedEmail,
} from '@provider/email';
import { JWTPayload } from '@services/jwt';
import { getBookingOccupiedRange } from '@utils/bookingOccupiedRange';
import { Types } from 'mongoose';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from 'node-be-utilities';
import ActivityLogService from './activityLog';
import BookingService from './booking';
import GuideAvailabilityService, { ConflictDetail } from './guideAvailability';
import NotificationService from './notification';
import TripService from './trip';

function conflictSummary(conflicts: ConflictDetail[]): string {
	return conflicts.map((c) => c.reason).join('; ');
}

async function assertNoConflictOrOverride(params: {
	guideId: string;
	booking: Pick<IBooking, 'travel_details' | 'booking_configuration'>;
	excludeAssignmentId?: string;
	override?: boolean;
}): Promise<ConflictDetail[]> {
	const { guideId, booking, excludeAssignmentId, override } = params;
	const range = getBookingOccupiedRange(booking);
	const { hasConflict, conflicts } = await GuideAvailabilityService.checkGuideConflict(
		guideId,
		range,
		excludeAssignmentId
	);

	if (hasConflict && !override) {
		throw new ConflictError(`Guide is not available for these dates: ${conflictSummary(conflicts)}`);
	}

	return conflicts;
}

interface PageParams {
	page?: number;
	limit?: number;
}

async function assertGuideAccount(guideId: string) {
	const guide = await AccountDB.findById(guideId);
	if (!guide) {
		throw new NotFoundError('Guide not found');
	}
	if (guide.role !== 'guide') {
		throw new BadRequestError('Selected account is not a guide');
	}
	return guide;
}

class AssignmentService {
	async createAssignment(params: {
		bookingId: string;
		guideId: string;
		adminNotes?: string;
		override?: boolean;
		overrideReason?: string;
		adminUserId: string;
	}) {
		const { bookingId, guideId, adminNotes, override, overrideReason, adminUserId } = params;

		const booking = await BookingDB.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		const existingActive = await AssignmentDB.findOne({
			booking: bookingId,
			status: { $in: ['pending', 'accepted'] },
		});
		if (existingActive) {
			throw new ConflictError('This booking already has an active assignment');
		}

		const guide = await assertGuideAccount(guideId);

		// Guide must not already be occupied (another active assignment, an
		// active leave, or a self-marked unavailable date) for this booking's
		// dates — unless the admin explicitly overrides with a reason.
		const conflicts = await assertNoConflictOrOverride({ guideId, booking, override });

		// Reuses the existing, unmodified BookingService.allocateGuide — flips
		// Booking to 'allocated' and sends its existing allocation emails.
		await BookingService.allocateGuide(new Types.ObjectId(bookingId), new Types.ObjectId(guideId));

		const assignment = await AssignmentDB.create({
			booking: bookingId,
			guide: guideId,
			assignedBy: adminUserId,
			status: 'pending',
			adminNotes,
		});

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'assignment.created',
			targetType: 'Assignment',
			targetId: assignment._id.toString(),
			description: `Assigned guide ${guide.name} to booking ${bookingId}`,
			metadata: { bookingId, guideId },
		});

		if (conflicts.length > 0) {
			await ActivityLogService.log({
				actor: adminUserId,
				action: 'assignment.conflict_overridden',
				targetType: 'Assignment',
				targetId: assignment._id.toString(),
				description: `Admin overrode an availability conflict to assign guide ${guide.name}: ${overrideReason}`,
				metadata: { bookingId, guideId, conflicts, overrideReason },
			});
		}

		await NotificationService.create({
			recipient: guideId,
			type: 'guide_assigned',
			title: 'New Assignment Request',
			message: `You've been proposed for a booking in ${booking.travel_details.city}. Please accept or decline.`,
			relatedEntity: { kind: 'Assignment', id: assignment._id.toString() },
			dedupeKey: `guide_assigned:${assignment._id.toString()}`,
		});

		if (booking.linked_to) {
			await NotificationService.create({
				recipient: booking.linked_to,
				type: 'booking_updated',
				title: 'Guide Assigned',
				message: `A guide has been assigned to your booking in ${booking.travel_details.city}.`,
				relatedEntity: { kind: 'Booking', id: booking._id.toString() },
				dedupeKey: `booking_updated:${booking._id.toString()}:allocated:${assignment._id.toString()}`,
			});
		}

		try {
			await sendGuideAssignedEmail(guide.email, {
				guideName: guide.name,
				city: booking.travel_details.city,
				places: booking.travel_details.places,
				date: new Date(booking.travel_details.date).toDateString(),
				noOfPersons: booking.travel_details.no_of_person,
				adminNotes,
			});
		} catch {
			// non-blocking — assignment already created successfully
		}

		return assignment;
	}

	async respond(params: {
		assignmentId: Types.ObjectId;
		guideUserId: string;
		action: 'accept' | 'decline';
		declineReason?: string;
	}) {
		const { assignmentId, guideUserId, action, declineReason } = params;

		const assignment = await AssignmentDB.findById(assignmentId);
		if (!assignment) {
			throw new NotFoundError('Assignment not found');
		}
		if (assignment.guide.toString() !== guideUserId) {
			throw new ForbiddenError('This assignment does not belong to you');
		}
		if (assignment.status !== 'pending') {
			throw new ConflictError(`Assignment has already been ${assignment.status}`);
		}

		const booking = await BookingDB.findById(assignment.booking);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		if (action === 'accept') {
			assignment.status = 'accepted';
			assignment.respondedAt = new Date();
			await assignment.save();

			const [trip, guide] = await Promise.all([
				TripService.createFromAssignment(assignment),
				AccountDB.findById(guideUserId),
			]);

			await ActivityLogService.log({
				actor: guideUserId,
				action: 'assignment.accepted',
				targetType: 'Assignment',
				targetId: assignment._id.toString(),
				description: `Guide ${guide?.name ?? ''} accepted the assignment`.trim(),
			});

			await NotificationService.create({
				recipient: assignment.assignedBy,
				type: 'guide_accepted',
				title: 'Guide Accepted Assignment',
				message: `${guide?.name ?? 'The guide'} accepted the assignment for booking in ${booking.travel_details.city}.`,
				relatedEntity: { kind: 'Assignment', id: assignment._id.toString() },
				dedupeKey: `guide_accepted:${assignment._id.toString()}`,
			});

			if (booking.linked_to) {
				await NotificationService.create({
					recipient: booking.linked_to,
					type: 'booking_updated',
					title: 'Guide Confirmed',
					message: `Your guide has confirmed your booking in ${booking.travel_details.city}.`,
					relatedEntity: { kind: 'Booking', id: booking._id.toString() },
					dedupeKey: `booking_updated:${booking._id.toString()}:accepted:${assignment._id.toString()}`,
				});
			}

			try {
				await sendGuideAcceptedEmail(booking.tourist_info.email, {
					guideName: guide?.name ?? 'Your guide',
					city: booking.travel_details.city,
					date: new Date(booking.travel_details.date).toDateString(),
					noOfPersons: booking.travel_details.no_of_person,
				});
			} catch {
				// non-blocking
			}

			return { assignment, trip };
		}

		// decline
		if (!declineReason) {
			throw new BadRequestError('A reason is required to decline an assignment');
		}

		assignment.status = 'declined';
		assignment.declineReason = declineReason;
		assignment.respondedAt = new Date();
		await assignment.save();

		// No existing BookingService method reverts an allocation — this is
		// the one transition with no reuse precedent, so it writes BookingDB
		// directly (the same pattern booking.ts itself uses for its fields).
		booking.allocated_guide = undefined;
		booking.status = 'successful';
		await booking.save();

		const guide = await AccountDB.findById(guideUserId);

		await ActivityLogService.log({
			actor: guideUserId,
			action: 'assignment.declined',
			targetType: 'Assignment',
			targetId: assignment._id.toString(),
			description: `Guide ${guide?.name ?? ''} declined the assignment: ${declineReason}`.trim(),
		});

		await NotificationService.create({
			recipient: assignment.assignedBy,
			type: 'guide_declined',
			title: 'Guide Declined Assignment',
			message: `${guide?.name ?? 'The guide'} declined the assignment for booking in ${booking.travel_details.city}. Please assign another guide.`,
			relatedEntity: { kind: 'Assignment', id: assignment._id.toString() },
			dedupeKey: `guide_declined:${assignment._id.toString()}`,
		});

		return { assignment, trip: null };
	}

	async reassignGuide(params: {
		currentAssignmentId: Types.ObjectId;
		newGuideId: string;
		adminNotes?: string;
		override?: boolean;
		overrideReason?: string;
		adminUserId: string;
	}) {
		const { currentAssignmentId, newGuideId, adminNotes, override, overrideReason, adminUserId } = params;

		const current = await AssignmentDB.findById(currentAssignmentId);
		if (!current) {
			throw new NotFoundError('Assignment not found');
		}
		if (current.status === 'accepted') {
			throw new ConflictError('Cannot reassign — the guide has already accepted and the trip has started');
		}
		if (current.status === 'reassigned') {
			throw new ConflictError('This assignment has already been reassigned');
		}

		const guide = await assertGuideAccount(newGuideId);
		const booking = await BookingDB.findById(current.booking);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		// New guide must not already be occupied for this booking's dates —
		// unless the admin explicitly overrides with a reason. Excludes the
		// assignment being reassigned away so its own (soon-to-be-stale) hold
		// on the calendar can't conflict against itself.
		const conflicts = await assertNoConflictOrOverride({
			guideId: newGuideId,
			booking,
			excludeAssignmentId: current._id.toString(),
			override,
		});

		current.status = 'reassigned';
		current.respondedAt = current.respondedAt ?? new Date();
		await current.save();

		if (booking.status === 'successful' || booking.status === 'confirmed') {
			// Came from a decline — reuse the existing allocation flow.
			await BookingService.allocateGuide(booking._id, new Types.ObjectId(newGuideId));
		} else if (booking.status === 'allocated') {
			// Reassign-while-pending: allocateGuide() would reject a booking
			// that's already 'allocated', so update it directly and reuse the
			// existing pure email senders (they don't gate on Booking status).
			booking.allocated_guide = new Types.ObjectId(newGuideId);
			await booking.save();

			const bookingDetails = {
				tourist_info: booking.tourist_info,
				travel_details: booking.travel_details,
				guide_preferences: booking.guide_preferences,
				booking_configuration: booking.booking_configuration,
				guide_info: { name: guide.name, email: guide.email, phone: guide.phone },
			};

			try {
				await sendBookingAllocatedTouristEmail(booking.tourist_info.email, bookingDetails);
				await sendBookingAllocatedGuideEmail(guide.email, bookingDetails);
			} catch {
				// non-blocking
			}
		} else {
			throw new ConflictError('Booking is not in a valid state for reassignment');
		}

		const newAssignment = await AssignmentDB.create({
			booking: booking._id,
			guide: newGuideId,
			assignedBy: adminUserId,
			status: 'pending',
			adminNotes,
			previousAssignment: current._id,
		});

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'assignment.reassigned',
			targetType: 'Assignment',
			targetId: newAssignment._id.toString(),
			description: `Reassigned booking ${booking._id.toString()} from guide ${current.guide.toString()} to ${guide.name}`,
			metadata: { previousAssignmentId: current._id.toString() },
		});

		if (conflicts.length > 0) {
			await ActivityLogService.log({
				actor: adminUserId,
				action: 'assignment.conflict_overridden',
				targetType: 'Assignment',
				targetId: newAssignment._id.toString(),
				description: `Admin overrode an availability conflict to reassign guide ${guide.name}: ${overrideReason}`,
				metadata: { bookingId: booking._id.toString(), guideId: newGuideId, conflicts, overrideReason },
			});
		}

		await NotificationService.create({
			recipient: newGuideId,
			type: 'guide_assigned',
			title: 'New Assignment Request',
			message: `You've been proposed for a booking in ${booking.travel_details.city}. Please accept or decline.`,
			relatedEntity: { kind: 'Assignment', id: newAssignment._id.toString() },
			dedupeKey: `guide_assigned:${newAssignment._id.toString()}`,
		});

		try {
			await sendGuideAssignedEmail(guide.email, {
				guideName: guide.name,
				city: booking.travel_details.city,
				places: booking.travel_details.places,
				date: new Date(booking.travel_details.date).toDateString(),
				noOfPersons: booking.travel_details.no_of_person,
				adminNotes,
			});
		} catch {
			// non-blocking
		}

		return newAssignment;
	}

	async getAssignableGuides() {
		const guideAccounts = await AccountDB.find({ role: 'guide', isActive: true })
			.select('name email phone')
			.lean();
		const accountIds = guideAccounts.map((g) => g._id);

		const guideProfiles = await GuideDB.find({ accountId: { $in: accountIds } })
			.select('accountId city languages isVisible membershipExpiryDate')
			.lean();
		const profileByAccountId = new Map(guideProfiles.map((p) => [p.accountId.toString(), p]));

		return guideAccounts.map((account) => {
			const profile = profileByAccountId.get(account._id.toString());
			return {
				accountId: account._id.toString(),
				name: account.name,
				email: account.email,
				phone: account.phone,
				city: profile?.city ?? '',
				languages: profile?.languages ?? [],
				isVisible: profile?.isVisible ?? false,
				membershipExpiryDate: profile?.membershipExpiryDate ?? null,
			};
		});
	}

	async getAll(
		filters: { status?: string; guideId?: string; bookingId?: string } = {},
		{ page = 1, limit = 20 }: PageParams = {}
	) {
		const query: Record<string, unknown> = {};
		if (filters.status) query.status = filters.status;
		if (filters.guideId) query.guide = filters.guideId;
		if (filters.bookingId) query.booking = filters.bookingId;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			AssignmentDB.find(query)
				.populate('booking', 'tourist_info travel_details linked_to status')
				.populate('guide', 'name email phone')
				.populate('assignedBy', 'name email')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			AssignmentDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getMy(guideUserId: string, filters: { status?: string } = {}, { page = 1, limit = 20 }: PageParams = {}) {
		const query: Record<string, unknown> = { guide: guideUserId };
		if (filters.status) query.status = filters.status;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			AssignmentDB.find(query)
				.populate('booking', 'tourist_info travel_details linked_to status')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			AssignmentDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getById(assignmentId: Types.ObjectId, requestingUser: JWTPayload) {
		const assignment = await AssignmentDB.findById(assignmentId)
			.populate('booking', 'tourist_info travel_details linked_to status')
			.populate('guide', 'name email phone')
			.populate('assignedBy', 'name email');

		if (!assignment) {
			throw new NotFoundError('Assignment not found');
		}

		if (requestingUser.role === 'admin') {
			return assignment;
		}
		if (requestingUser.role === 'guide' && assignment.guide._id.toString() === requestingUser.userId) {
			return assignment;
		}

		throw new ForbiddenError('You do not have access to this assignment');
	}
}

export default new AssignmentService();
