import { AccountDB, NotificationDB } from '@mongo';
import NotificationService from '@services/notification';
import { Types } from 'mongoose';
import { NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

describe('NotificationService', () => {
	let recipientId: Types.ObjectId;
	let otherUserId: Types.ObjectId;

	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();

		const recipient = await AccountDB.create({
			name: 'Recipient',
			email: 'recipient@example.com',
			phone: '+1000000000',
			password: 'password123',
			role: 'guide',
		});
		recipientId = recipient._id;

		const otherUser = await AccountDB.create({
			name: 'Other',
			email: 'other@example.com',
			phone: '+1000000001',
			password: 'password123',
			role: 'tourist',
		});
		otherUserId = otherUser._id;
	});

	describe('create', () => {
		it('creates a notification', async () => {
			const notification = await NotificationService.create({
				recipient: recipientId,
				type: 'guide_assigned',
				title: 'New Assignment Request',
				message: 'You have a new booking to review.',
				dedupeKey: 'guide_assigned:abc123',
			});

			expect(notification).toBeTruthy();
			expect(notification?.isRead).toBe(false);
		});

		it('is idempotent — a duplicate dedupeKey returns null instead of throwing or duplicating', async () => {
			const params = {
				recipient: recipientId,
				type: 'membership_expiring' as const,
				title: 'Membership Expiring Soon',
				message: 'Your membership expires in 3 days.',
				dedupeKey: 'membership_expiring:guide1:3',
			};

			const first = await NotificationService.create(params);
			const second = await NotificationService.create(params);

			expect(first).toBeTruthy();
			expect(second).toBeNull();
			expect(await NotificationDB.countDocuments({ dedupeKey: params.dedupeKey })).toBe(1);
		});
	});

	describe('getMyNotifications / getUnreadCount', () => {
		it('scopes results to the recipient and supports unreadOnly', async () => {
			await NotificationService.create({
				recipient: recipientId,
				type: 'guide_assigned',
				title: 'A',
				message: 'A',
				dedupeKey: 'a',
			});
			const readOne = await NotificationService.create({
				recipient: recipientId,
				type: 'guide_accepted',
				title: 'B',
				message: 'B',
				dedupeKey: 'b',
			});
			await NotificationService.create({
				recipient: otherUserId,
				type: 'guide_assigned',
				title: 'C',
				message: 'C',
				dedupeKey: 'c',
			});

			await NotificationService.markRead(recipientId.toString(), readOne!._id);

			const all = await NotificationService.getMyNotifications(recipientId.toString());
			expect(all.total).toBe(2);

			const unreadOnly = await NotificationService.getMyNotifications(recipientId.toString(), {
				unreadOnly: true,
			});
			expect(unreadOnly.total).toBe(1);

			const { count } = await NotificationService.getUnreadCount(recipientId.toString());
			expect(count).toBe(1);
		});
	});

	describe('markRead', () => {
		it('throws NotFoundError if the notification does not belong to the caller', async () => {
			const notification = await NotificationService.create({
				recipient: recipientId,
				type: 'guide_assigned',
				title: 'A',
				message: 'A',
				dedupeKey: 'd',
			});

			await expect(
				NotificationService.markRead(otherUserId.toString(), notification!._id)
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('markAllRead', () => {
		it('marks every unread notification for the recipient as read', async () => {
			await NotificationService.create({
				recipient: recipientId,
				type: 'guide_assigned',
				title: 'A',
				message: 'A',
				dedupeKey: 'e',
			});
			await NotificationService.create({
				recipient: recipientId,
				type: 'guide_accepted',
				title: 'B',
				message: 'B',
				dedupeKey: 'f',
			});

			const result = await NotificationService.markAllRead(recipientId.toString());

			expect(result.modifiedCount).toBe(2);
			const { count } = await NotificationService.getUnreadCount(recipientId.toString());
			expect(count).toBe(0);
		});
	});
});
