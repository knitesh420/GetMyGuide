import {
	dueMembershipReminderDays,
	isMembershipActive,
} from '@utils/guideMembership';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('guide membership eligibility', () => {
	const now = new Date('2026-06-01T12:00:00.000Z');

	it('allows an approved, visible guide until the exact expiry timestamp', () => {
		expect(
			isMembershipActive(
				{
					isVisible: true,
					approvalStatus: 'approved',
					membershipExpiryDate: new Date(now.getTime() + 1),
				},
				now
			)
		).toBe(true);
		expect(
			isMembershipActive(
				{
					isVisible: true,
					approvalStatus: 'approved',
					membershipExpiryDate: now,
				},
				now
			)
		).toBe(false);
	});

	it.each(['pending', 'rejected'] as const)(
		'does not allow a %s guide to appear publicly',
		(approvalStatus) => {
			expect(
				isMembershipActive(
					{
						isVisible: true,
						approvalStatus,
						membershipExpiryDate: new Date(now.getTime() + DAY_MS),
					},
					now
				)
			).toBe(false);
		}
	);

	it('allows only approved reminder thresholds based on the stored expiry timestamp', () => {
		const expiry = new Date('2026-07-01T10:15:00.000Z');
		expect(
			dueMembershipReminderDays(
				expiry,
				new Date(expiry.getTime() - 5 * DAY_MS)
			)
		).toEqual([5]);
		expect(
			dueMembershipReminderDays(
				expiry,
				new Date(expiry.getTime() - 3 * DAY_MS)
			)
		).toEqual([5, 3]);
		expect(
			dueMembershipReminderDays(
				expiry,
				new Date(expiry.getTime() - DAY_MS)
			)
		).toEqual([5, 3, 1]);
		expect(dueMembershipReminderDays(expiry, expiry)).toEqual([5, 3, 1, 0]);
		expect(
			dueMembershipReminderDays(
				expiry,
				new Date(expiry.getTime() + 6 * DAY_MS)
			)
		).toEqual([]);
	});
});
