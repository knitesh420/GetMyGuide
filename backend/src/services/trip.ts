import { AccountDB, BookingDB, TripDB } from '@mongo';
import IAssignment from '@mongo/types/assignment';
import { JWTPayload } from '@services/jwt';
import { sendTripCompletedEmail, sendTripStartedEmail } from '@provider/email';
import { Types } from 'mongoose';
import { ConflictError, ForbiddenError, NotFoundError } from 'node-be-utilities';
import ActivityLogService from './activityLog';
import InvoiceService from './invoice';
import NotificationService from './notification';

interface PageParams {
	page?: number;
	limit?: number;
}

class TripService {
	/**
	 * Called internally by AssignmentService when a guide accepts — no HTTP
	 * route of its own.
	 */
	async createFromAssignment(assignment: IAssignment) {
		const existing = await TripDB.findOne({ booking: assignment.booking });
		if (existing) return existing;

		return TripDB.create({
			booking: assignment.booking,
			assignment: assignment._id,
			guide: assignment.guide,
		});
	}

	private async getOwnedTrip(tripId: Types.ObjectId, guideUserId: string) {
		const trip = await TripDB.findById(tripId);
		if (!trip) {
			throw new NotFoundError('Trip not found');
		}
		if (trip.guide.toString() !== guideUserId) {
			throw new ForbiddenError('You are not the assigned guide for this trip');
		}
		return trip;
	}

	async start(tripId: Types.ObjectId, guideUserId: string, notes?: string) {
		const trip = await this.getOwnedTrip(tripId, guideUserId);
		if (trip.status !== 'not-started') {
			throw new ConflictError('Trip has already been started');
		}

		trip.status = 'in-progress';
		trip.startedAt = new Date();
		if (notes) trip.startNotes = notes;
		await trip.save();

		const [booking, guide] = await Promise.all([
			BookingDB.findById(trip.booking),
			AccountDB.findById(guideUserId),
		]);

		await ActivityLogService.log({
			actor: guideUserId,
			action: 'trip.started',
			targetType: 'Trip',
			targetId: trip._id.toString(),
			description: `Guide ${guide?.name ?? ''} started the trip`.trim(),
		});

		if (booking?.linked_to) {
			await NotificationService.create({
				recipient: booking.linked_to,
				type: 'trip_started',
				title: 'Trip Started',
				message: `Your guide ${guide?.name ?? ''} has started your trip.`,
				relatedEntity: { kind: 'Trip', id: trip._id.toString() },
				dedupeKey: `trip_started:${trip._id.toString()}`,
			});

			try {
				await sendTripStartedEmail(booking.tourist_info.email, {
					touristName: booking.tourist_info.name,
					guideName: guide?.name ?? 'Your guide',
					city: booking.travel_details.city,
				});
			} catch {
				// non-blocking — trip already started successfully
			}
		}

		return trip;
	}

	async complete(tripId: Types.ObjectId, guideUserId: string, completionNotes?: string) {
		const trip = await this.getOwnedTrip(tripId, guideUserId);
		if (trip.status !== 'in-progress') {
			throw new ConflictError('Trip is not in progress');
		}

		trip.status = 'completed';
		trip.completedAt = new Date();
		if (completionNotes) trip.completionNotes = completionNotes;
		await trip.save();

		// No existing Booking method sets status to 'completed' — this is the
		// first transition to ever do so, via a direct write (the same
		// pattern booking.ts itself uses to touch other models directly).
		const [booking, guide] = await Promise.all([
			BookingDB.findByIdAndUpdate(trip.booking, { status: 'completed' }, { new: true }),
			AccountDB.findById(guideUserId),
		]);

		await ActivityLogService.log({
			actor: guideUserId,
			action: 'trip.completed',
			targetType: 'Trip',
			targetId: trip._id.toString(),
			description: `Guide ${guide?.name ?? ''} completed the trip`.trim(),
		});

		if (booking?.linked_to) {
			await NotificationService.create({
				recipient: booking.linked_to,
				type: 'trip_completed',
				title: 'Trip Completed',
				message: `Your trip with ${guide?.name ?? ''} is complete. Leave a review to share your experience!`,
				relatedEntity: { kind: 'Trip', id: trip._id.toString() },
				dedupeKey: `trip_completed:${trip._id.toString()}`,
			});

			try {
				await sendTripCompletedEmail(booking.tourist_info.email, {
					touristName: booking.tourist_info.name,
					guideName: guide?.name ?? 'Your guide',
					city: booking.travel_details.city,
				});
			} catch {
				// non-blocking — trip already completed successfully
			}
		}

		try {
			await InvoiceService.createTripCompletionInvoice(trip);
		} catch {
			// non-blocking — trip already completed successfully
		}

		return trip;
	}

	async cancel(tripId: Types.ObjectId, adminUserId: string, reason?: string) {
		const trip = await TripDB.findById(tripId);
		if (!trip) {
			throw new NotFoundError('Trip not found');
		}
		if (trip.status === 'completed' || trip.status === 'cancelled') {
			throw new ConflictError(`Trip is already ${trip.status}`);
		}

		trip.status = 'cancelled';
		if (reason) trip.completionNotes = reason;
		await trip.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'trip.cancelled',
			targetType: 'Trip',
			targetId: trip._id.toString(),
			description: 'Admin cancelled the trip',
			metadata: reason ? { reason } : undefined,
		});

		return trip;
	}

	async getAll(
		filters: { status?: string; guideId?: string } = {},
		{ page = 1, limit = 20 }: PageParams = {}
	) {
		const query: Record<string, unknown> = {};
		if (filters.status) query.status = filters.status;
		if (filters.guideId) query.guide = filters.guideId;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			TripDB.find(query)
				.populate('booking', 'tourist_info travel_details linked_to status')
				.populate('guide', 'name email phone')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			TripDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getMy(guideUserId: string, filters: { status?: string } = {}, { page = 1, limit = 20 }: PageParams = {}) {
		const query: Record<string, unknown> = { guide: guideUserId };
		if (filters.status) query.status = filters.status;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			TripDB.find(query)
				.populate('booking', 'tourist_info travel_details linked_to status')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			TripDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getMyAsTourist(touristUserId: string, { page = 1, limit = 20 }: PageParams = {}) {
		const bookings = await BookingDB.find({ linked_to: touristUserId }).select('_id').lean();
		const bookingIds = bookings.map((b) => b._id);

		const query = { booking: { $in: bookingIds } };
		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			TripDB.find(query)
				.populate('booking', 'tourist_info travel_details linked_to status')
				.populate('guide', 'name email phone')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			TripDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getById(tripId: Types.ObjectId, requestingUser: JWTPayload) {
		const trip = await TripDB.findById(tripId)
			.populate('booking', 'tourist_info travel_details linked_to status')
			.populate('guide', 'name email phone');

		if (!trip) {
			throw new NotFoundError('Trip not found');
		}

		if (requestingUser.role === 'admin') {
			return trip;
		}

		if (requestingUser.role === 'guide' && trip.guide._id.toString() === requestingUser.userId) {
			return trip;
		}

		const booking = trip.booking as any;
		if (requestingUser.role === 'tourist' && booking?.linked_to?.toString() === requestingUser.userId) {
			return trip;
		}

		throw new ForbiddenError('You do not have access to this trip');
	}
}

export default new TripService();
