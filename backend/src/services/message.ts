import { AccountDB, BookingDB, MessageDB } from '@mongo';
import IBooking from '@mongo/types/booking';
import { JWTPayload } from '@services/jwt';
import { Types } from 'mongoose';
import { ConflictError, ForbiddenError, NotFoundError } from 'node-be-utilities';
import NotificationService from './notification';

interface PageParams {
	page?: number;
	limit?: number;
}

/** A thread is dead once the booking is over — no messaging into the void. */
const CLOSED_BOOKING_STATUSES = ['cancelled'];

class MessageService {
	/**
	 * A booking's thread is visible to the tourist who booked it, the guide it is
	 * allocated to, and admins. Anyone else gets a 403 — including a guide who
	 * merely used to be assigned to it before a reassignment.
	 */
	private async authorize(bookingId: Types.ObjectId | string, user: JWTPayload): Promise<IBooking> {
		const booking = await BookingDB.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		if (user.role === 'admin') {
			return booking;
		}

		const isTourist = booking.linked_to?.toString() === user.userId;
		const isGuide = booking.allocated_guide?.toString() === user.userId;

		if (!isTourist && !isGuide) {
			throw new ForbiddenError('You do not have access to this conversation');
		}

		return booking;
	}

	/**
	 * The booking ids the caller is party to. Admins are handled by the callers,
	 * which skip this filter entirely rather than materialising every booking id.
	 */
	private async myBookingIds(user: JWTPayload): Promise<Types.ObjectId[]> {
		const bookings = await BookingDB.find({
			$or: [{ linked_to: user.userId }, { allocated_guide: user.userId }],
		})
			.select('_id')
			.lean();

		return bookings.map((b) => b._id);
	}

	/**
	 * Fetch a thread, oldest-first. `after` is a message id: the client passes
	 * the last one it holds and gets only what arrived since, which is what makes
	 * polling cheap rather than re-downloading the thread every few seconds.
	 */
	async getThread(
		bookingId: Types.ObjectId | string,
		user: JWTPayload,
		{ after, limit = 50 }: { after?: string; limit?: number } = {}
	) {
		await this.authorize(bookingId, user);

		const query: Record<string, unknown> = { booking: bookingId };
		if (after) {
			// ObjectIds are monotonic by creation time, so "_id greater than the
			// last one I have" is a correct and index-friendly cursor.
			query._id = { $gt: new Types.ObjectId(after) };
		}

		const messages = await MessageDB.find(query)
			.populate('sender', 'name role')
			.sort({ createdAt: 1 })
			.limit(limit)
			.lean();

		// Opening the thread is reading it.
		await this.markThreadRead(bookingId, user.userId);

		return messages;
	}

	async send(params: { bookingId: Types.ObjectId | string; user: JWTPayload; body: string }) {
		const { bookingId, user, body } = params;

		const booking = await this.authorize(bookingId, user);

		if (CLOSED_BOOKING_STATUSES.includes(booking.status)) {
			throw new ConflictError('This booking is cancelled — the conversation is closed');
		}

		const message = await MessageDB.create({
			booking: booking._id,
			sender: user.userId,
			senderRole: user.role,
			body,
			// The sender has, definitionally, read their own message.
			readBy: [user.userId],
		});

		await this.notifyCounterparty(booking, user, body, message._id.toString());

		// Re-read to hand back the populated sender the thread view renders, rather
		// than making the client resolve the id itself.
		const populated = await MessageDB.findById(message._id).populate('sender', 'name role').lean();
		if (!populated) {
			throw new NotFoundError('Message could not be read back after sending');
		}

		return populated;
	}

	/**
	 * Ping whoever is on the other side of the thread. An admin writing in gets
	 * routed to both the tourist and the guide, since they're speaking for the
	 * platform rather than as one of the two parties.
	 */
	private async notifyCounterparty(
		booking: IBooking,
		sender: JWTPayload,
		body: string,
		messageId: string
	) {
		const recipients: Types.ObjectId[] = [];

		if (sender.role === 'tourist' && booking.allocated_guide) {
			recipients.push(booking.allocated_guide);
		} else if (sender.role === 'guide' && booking.linked_to) {
			recipients.push(booking.linked_to);
		} else if (sender.role === 'admin') {
			if (booking.linked_to) recipients.push(booking.linked_to);
			if (booking.allocated_guide) recipients.push(booking.allocated_guide);
		}

		const senderAccount = await AccountDB.findById(sender.userId).select('name').lean();
		const preview = body.length > 80 ? `${body.slice(0, 77)}…` : body;

		await Promise.all(
			recipients
				.filter((recipient) => recipient.toString() !== sender.userId)
				.map((recipient) =>
					NotificationService.create({
						recipient,
						type: 'new_message',
						title: `New message from ${senderAccount?.name ?? 'your ' + sender.role}`,
						message: preview,
						relatedEntity: { kind: 'Booking', id: booking._id.toString() },
						// Per-message, not per-thread: every message is worth a ping.
						dedupeKey: `new_message:${messageId}:${recipient.toString()}`,
					})
				)
		);
	}

	async markThreadRead(bookingId: Types.ObjectId | string, userId: string) {
		const result = await MessageDB.updateMany(
			{ booking: bookingId, readBy: { $ne: new Types.ObjectId(userId) } },
			{ $addToSet: { readBy: new Types.ObjectId(userId) } }
		);
		return { modifiedCount: result.modifiedCount };
	}

	/** Total unread across every thread the caller is party to — drives the badge. */
	async getUnreadCount(user: JWTPayload) {
		const query: Record<string, unknown> = {
			sender: { $ne: new Types.ObjectId(user.userId) },
			readBy: { $ne: new Types.ObjectId(user.userId) },
		};

		if (user.role !== 'admin') {
			query.booking = { $in: await this.myBookingIds(user) };
		}

		const count = await MessageDB.countDocuments(query);
		return { count };
	}

	/**
	 * The chat inbox: one row per booking that has messages, with its last message
	 * and the caller's unread count.
	 */
	async getThreads(user: JWTPayload, { page = 1, limit = 20 }: PageParams = {}) {
		const match: Record<string, unknown> = {};
		if (user.role !== 'admin') {
			match.booking = { $in: await this.myBookingIds(user) };
		}

		const userId = new Types.ObjectId(user.userId);
		const skip = (page - 1) * limit;

		const rows = await MessageDB.aggregate([
			{ $match: match },
			{ $sort: { createdAt: -1 } },
			{
				$group: {
					_id: '$booking',
					lastMessage: { $first: '$$ROOT' },
					unreadCount: {
						$sum: {
							$cond: [
								{
									$and: [
										{ $ne: ['$sender', userId] },
										{ $not: { $in: [userId, '$readBy'] } },
									],
								},
								1,
								0,
							],
						},
					},
					total: { $sum: 1 },
				},
			},
			{ $sort: { 'lastMessage.createdAt': -1 } },
			{ $skip: skip },
			{ $limit: limit },
			{
				$lookup: {
					from: 'bookings',
					localField: '_id',
					foreignField: '_id',
					as: 'booking',
				},
			},
			{ $unwind: '$booking' },
			{
				$project: {
					_id: 0,
					bookingId: '$_id',
					bookingCode: '$booking.bookingCode',
					city: '$booking.travel_details.city',
					date: '$booking.travel_details.date',
					status: '$booking.status',
					touristName: '$booking.tourist_info.name',
					unreadCount: 1,
					messageCount: '$total',
					lastMessage: {
						body: '$lastMessage.body',
						senderRole: '$lastMessage.senderRole',
						createdAt: '$lastMessage.createdAt',
					},
				},
			},
		]);

		return { data: rows, page, limit };
	}
}

export default new MessageService();
