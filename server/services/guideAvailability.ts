import { AccountDB, AssignmentDB, GuideDB, GuideLeaveDB, TripDB } from '@mongo';
import IBooking from '@mongo/types/booking';
import { DateRange, endOfDay, getBookingOccupiedRange, rangesOverlap, startOfDay } from '@utils/bookingOccupiedRange';
import { Types } from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from 'node-be-utilities';

export interface ConflictDetail {
	type: 'assignment' | 'leave' | 'unavailable_date';
	start: Date;
	end: Date;
	reason?: string;
	bookingId?: string;
	city?: string;
}

interface OccupiedAssignment {
	assignmentId: string;
	status: string;
	start: Date;
	end: Date;
	bookingId: string;
	city: string;
}

/**
 * Active (pending/accepted) assignments for a guide, excluding any whose
 * Trip has since been cancelled — Trip.cancel() doesn't revert the
 * assignment's status, so the trip is the source of truth for "still holds
 * the guide's calendar".
 */
async function getOccupiedAssignments(
	guideId: string,
	excludeAssignmentId?: string
): Promise<OccupiedAssignment[]> {
	const query: Record<string, unknown> = {
		guide: guideId,
		status: { $in: ['pending', 'accepted'] },
	};
	if (excludeAssignmentId) {
		query._id = { $ne: excludeAssignmentId };
	}

	const assignments = await AssignmentDB.find(query)
		.populate<{ booking: IBooking }>('booking', 'travel_details booking_configuration')
		.lean();

	if (assignments.length === 0) return [];

	const trips = await TripDB.find({ assignment: { $in: assignments.map((a) => a._id) } })
		.select('assignment status')
		.lean();
	const cancelledAssignmentIds = new Set(
		trips.filter((t) => t.status === 'cancelled').map((t) => t.assignment.toString())
	);

	return assignments
		.filter((a) => a.booking && !cancelledAssignmentIds.has(a._id.toString()))
		.map((a) => {
			const range = getBookingOccupiedRange(a.booking);
			return {
				assignmentId: a._id.toString(),
				status: a.status,
				start: range.start,
				end: range.end,
				bookingId: a.booking._id.toString(),
				city: a.booking.travel_details.city,
			};
		});
}

class GuideAvailabilityService {
	/**
	 * Checks whether assigning a guide to a booking occupying `range` would
	 * overlap another active assignment, an active leave period, or a
	 * self-marked unavailable date. Used by AssignmentService before create/
	 * reassign — never mutates anything.
	 */
	async checkGuideConflict(
		guideId: string,
		range: DateRange,
		excludeAssignmentId?: string
	): Promise<{ hasConflict: boolean; conflicts: ConflictDetail[] }> {
		const conflicts: ConflictDetail[] = [];

		const occupied = await getOccupiedAssignments(guideId, excludeAssignmentId);
		for (const o of occupied) {
			if (rangesOverlap(range, { start: o.start, end: o.end })) {
				conflicts.push({
					type: 'assignment',
					start: o.start,
					end: o.end,
					bookingId: o.bookingId,
					city: o.city,
					reason: `Already ${o.status} for a booking in ${o.city}`,
				});
			}
		}

		const leaves = await GuideLeaveDB.find({ guide: guideId, status: 'active' }).lean();
		for (const leave of leaves) {
			const leaveRange: DateRange = { start: startOfDay(leave.startDate), end: endOfDay(leave.endDate) };
			if (rangesOverlap(range, leaveRange)) {
				conflicts.push({
					type: 'leave',
					start: leaveRange.start,
					end: leaveRange.end,
					reason: leave.reason || `On ${leave.type}`,
				});
			}
		}

		const account = await AccountDB.findById(guideId).select('unavailableDates').lean();
		const unavailableDates = account?.unavailableDates || [];
		for (const d of unavailableDates) {
			const day = startOfDay(new Date(d));
			if (rangesOverlap(range, { start: day, end: endOfDay(day) })) {
				conflicts.push({
					type: 'unavailable_date',
					start: day,
					end: endOfDay(day),
					reason: 'Guide marked this date unavailable',
				});
			}
		}

		return { hasConflict: conflicts.length > 0, conflicts };
	}

	/**
	 * Merged calendar for a single guide — unavailable dates + active leaves +
	 * booked ranges from active assignments. Powers both the guide's own
	 * availability page and the admin guide-calendar view.
	 */
	async getGuideCalendar(guideId: string) {
		const account = await AccountDB.findOne({ _id: guideId, role: 'guide' }).select('unavailableDates').lean();
		if (!account) {
			throw new NotFoundError('Guide not found');
		}

		const [leaves, occupied] = await Promise.all([
			GuideLeaveDB.find({ guide: guideId, status: 'active' }).sort({ startDate: 1 }).lean(),
			getOccupiedAssignments(guideId),
		]);

		return {
			unavailableDates: account.unavailableDates || [],
			leaves,
			bookedRanges: occupied.map((o) => ({
				start: o.start,
				end: o.end,
				bookingId: o.bookingId,
				city: o.city,
				status: o.status,
			})),
		};
	}

	async createLeave(
		guideUserId: string,
		data: { type: 'vacation' | 'emergency'; startDate: string; endDate: string; reason?: string }
	) {
		const start = startOfDay(new Date(data.startDate));
		const end = endOfDay(new Date(data.endDate));
		if (end < start) {
			throw new BadRequestError('endDate must be on or after startDate');
		}

		const leave = await GuideLeaveDB.create({
			guide: guideUserId,
			type: data.type,
			startDate: start,
			endDate: end,
			reason: data.reason,
			status: 'active',
		});

		return leave;
	}

	async getMyLeaves(guideUserId: string) {
		return GuideLeaveDB.find({ guide: guideUserId }).sort({ startDate: -1 }).lean();
	}

	async getLeavesForGuide(guideId: string) {
		return GuideLeaveDB.find({ guide: guideId }).sort({ startDate: -1 }).lean();
	}

	async cancelLeave(guideUserId: string, leaveId: Types.ObjectId) {
		const leave = await GuideLeaveDB.findById(leaveId);
		if (!leave) {
			throw new NotFoundError('Leave not found');
		}
		if (leave.guide.toString() !== guideUserId) {
			throw new ForbiddenError('This leave does not belong to you');
		}

		leave.status = 'cancelled';
		await leave.save();
		return leave;
	}

	/**
	 * Assignable guides annotated with availability for a given date range —
	 * feeds the admin "Available/Unavailable Guides" panel and the Assign
	 * Guide modal's conflict badges. Deliberately queries Account/Guide
	 * directly rather than importing AssignmentService.getAssignableGuides,
	 * since AssignmentService imports this service (would create a cycle).
	 */
	async getGuidesAvailability(range: DateRange) {
		const guideAccounts = await AccountDB.find({ role: 'guide', isActive: true })
			.select('name email phone')
			.lean();
		const accountIds = guideAccounts.map((g) => g._id);

		const guideProfiles = await GuideDB.find({ accountId: { $in: accountIds } })
			.select('accountId city languages isVisible membershipExpiryDate')
			.lean();
		const profileByAccountId = new Map(guideProfiles.map((p) => [p.accountId.toString(), p]));

		const results = await Promise.all(
			guideAccounts.map(async (account) => {
				const profile = profileByAccountId.get(account._id.toString());
				const { hasConflict, conflicts } = await this.checkGuideConflict(account._id.toString(), range);
				return {
					accountId: account._id.toString(),
					name: account.name,
					email: account.email,
					phone: account.phone,
					city: profile?.city ?? '',
					languages: profile?.languages ?? [],
					isVisible: profile?.isVisible ?? false,
					membershipExpiryDate: profile?.membershipExpiryDate ?? null,
					isAvailable: !hasConflict,
					conflicts,
				};
			})
		);

		return results;
	}
}

export default new GuideAvailabilityService();
