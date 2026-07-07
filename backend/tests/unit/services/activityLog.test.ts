import { AccountDB, ActivityLogDB } from '@mongo';
import ActivityLogService from '@services/activityLog';
import { Types } from 'mongoose';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

describe('ActivityLogService', () => {
	let actorId: Types.ObjectId;

	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();

		const actor = await AccountDB.create({
			name: 'Admin',
			email: 'admin@example.com',
			phone: '+1000000000',
			password: 'password123',
			role: 'admin',
		});
		actorId = actor._id;
	});

	describe('log', () => {
		it('writes an entry with the given fields', async () => {
			await ActivityLogService.log({
				actor: actorId,
				action: 'assignment.created',
				targetType: 'Assignment',
				targetId: 'assignment-1',
				description: 'Assigned guide to booking',
				metadata: { guideId: 'g-1' },
			});

			const entries = await ActivityLogDB.find({});
			expect(entries).toHaveLength(1);
			expect(entries[0].action).toBe('assignment.created');
			expect(entries[0].actorType).toBe('user');
			expect(entries[0].metadata).toEqual({ guideId: 'g-1' });
		});

		it('defaults actorType to "user" and never throws even if the write fails', async () => {
			const createSpy = jest.spyOn(ActivityLogDB, 'create').mockRejectedValueOnce(new Error('boom'));

			await expect(
				ActivityLogService.log({
					action: 'trip.completed',
					targetType: 'Trip',
					targetId: 'trip-1',
					description: 'System-triggered completion',
				})
			).resolves.toBeUndefined();

			createSpy.mockRestore();
		});
	});

	describe('getForTarget', () => {
		it('returns paginated entries scoped to one target', async () => {
			await ActivityLogService.log({
				actor: actorId,
				action: 'trip.started',
				targetType: 'Trip',
				targetId: 'trip-1',
				description: 'Started',
			});
			await ActivityLogService.log({
				actor: actorId,
				action: 'trip.completed',
				targetType: 'Trip',
				targetId: 'trip-1',
				description: 'Completed',
			});
			await ActivityLogService.log({
				actor: actorId,
				action: 'trip.started',
				targetType: 'Trip',
				targetId: 'trip-2',
				description: 'Different trip',
			});

			const result = await ActivityLogService.getForTarget('Trip', 'trip-1');

			expect(result.total).toBe(2);
			expect(result.data.every((e) => e.targetId === 'trip-1')).toBe(true);
			// newest first
			expect(result.data[0].action).toBe('trip.completed');
		});
	});

	describe('getAll', () => {
		it('filters by action, actorType, and target type', async () => {
			await ActivityLogService.log({
				actor: actorId,
				actorType: 'user',
				action: 'review.created',
				targetType: 'Review',
				targetId: 'review-1',
				description: 'Tourist left a review',
			});
			await ActivityLogService.log({
				actorType: 'system',
				action: 'notification.payment_successful',
				targetType: 'Transaction',
				targetId: 'txn-1',
				description: 'Watcher notified tourist',
			});

			const reviewOnly = await ActivityLogService.getAll({ targetType: 'Review' });
			expect(reviewOnly.total).toBe(1);

			const systemOnly = await ActivityLogService.getAll({ actorType: 'system' });
			expect(systemOnly.total).toBe(1);
			expect(systemOnly.data[0].action).toBe('notification.payment_successful');

			const byAction = await ActivityLogService.getAll({ action: 'review.created' });
			expect(byAction.total).toBe(1);
		});
	});
});
