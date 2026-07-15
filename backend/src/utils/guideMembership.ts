import IGuide from '@mongo/types/guide';

type MembershipShape = Pick<
	IGuide,
	'isVisible' | 'membershipExpiryDate' | 'approvalStatus'
>;

/**
 * The single source of truth for "is this guide currently entitled to a public
 * listing and to take new bookings?".
 *
 * Public visibility is driven entirely by the membership window, not by
 * Account.status: a guide's listing lapses automatically the instant their
 * 30-day membership expires, with no cron job, because this predicate is
 * evaluated on every read. Both halves of the rule matter:
 *
 *   - `isVisible` is set true only once the guide is approved AND has paid (see
 *     finalizeMembershipPaymentByGuideId / approveGuide), and cleared on
 *     rejection. It is the "switched on" flag.
 *   - `membershipExpiryDate > now` is the "still paid up" clock. A renewal
 *     pushes it forward and the guide reappears with no manual action.
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
		approvalStatus: { $ne: 'rejected' },
	};
}
