import IGuide from '@mongo/types/guide';

const DAY_MS = 24 * 60 * 60 * 1000;
export const MEMBERSHIP_EXPIRY_REMINDER_DAYS = [5, 3, 1, 0] as const;

type MembershipShape = Pick<
	IGuide,
	'isVisible' | 'membershipExpiryDate' | 'approvalStatus'
>;

export function dueMembershipReminderDays(expiryAt: Date, now: Date = new Date()): number[] {
	const expiryTime = expiryAt.getTime();
	const nowTime = now.getTime();
	if (nowTime > expiryTime + 5 * DAY_MS) return [];

	return MEMBERSHIP_EXPIRY_REMINDER_DAYS.filter(
		(day) => nowTime >= expiryTime - day * DAY_MS
	);
}

/**
 * The single source of truth for "is this guide currently entitled to a public
 * listing and to take new bookings?".
 *
 * Public visibility is driven by approval and an active membership period.
 * The period may be a one-time trial or a paid membership; a missing
 * membershipPlan is treated as a legacy paid period for compatibility.
 *
 *   - `isVisible` is set true only after approval and membership activation.
 *   - `membershipExpiryDate > now` is the active-period clock; expiry
 *     automatically removes a guide from public results.
 *
 * The `approvalStatus !== 'rejected'` guard is a second line of defence: a guide
 * rejected after going live must be delisted even if some path forgot to clear
 * `isVisible`.
 */
export function isMembershipActive(
	guide: MembershipShape | null | undefined,
	now: Date = new Date()
): boolean {
	if (!guide) return false;
	if (guide.approvalStatus === 'rejected') return false;
	if (guide.approvalStatus && guide.approvalStatus !== 'approved') return false;
	return (
		guide.isVisible === true &&
		!!guide.membershipExpiryDate &&
		new Date(guide.membershipExpiryDate) > now
	);
}

/**
 * The exact Mongo filter fragment that selects publicly-listable guides, so
 * every public guide query enforces the same rule rather than re-deriving it.
 * Spread this into a larger `GuideDB.find(...)` query.
 *
 * Kept in lock-step with {@link isMembershipActive} above — the predicate is
 * what an in-memory document is tested against, this is the same test pushed
 * into the database.
 */
export function activeMembershipFilter(now: Date = new Date()): Record<string, unknown> {
	return {
		isVisible: true,
		membershipExpiryDate: { $gt: now },
		$or: [
			{ approvalStatus: 'approved' },
			{ approvalStatus: { $exists: false } },
		],
	};
}
