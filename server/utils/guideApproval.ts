import IGuide from '@mongo/types/guide';

type ApprovalShape = Pick<IGuide, 'approvalStatus' | 'isVisible'>;

/**
 * Is this guide cleared by an admin to take bookings?
 *
 * `approvalStatus` was added after the platform was already live, so guides who
 * registered before it exists have no value at all. Those guides were vetted (or
 * not) under the old implicit rule — pay for membership and you're listed — and
 * delisting every one of them the moment this field shipped would be a
 * production outage, not a security improvement. So an absent status is read as
 * approved *only* when the guide is already publicly visible; a guide who never
 * got listed still has to go through review like everyone else.
 *
 * Run scripts/backfillGuideApproval.ts to make the grandfathered rows explicit,
 * after which this fallback stops mattering.
 */
export function isGuideApproved(guide: ApprovalShape | null | undefined): boolean {
	if (!guide) return false;
	if (guide.approvalStatus) {
		return guide.approvalStatus === 'approved';
	}
	return guide.isVisible === true;
}

/** What to show in an admin table for a guide that predates the review flow. */
export function displayApprovalStatus(guide: ApprovalShape | null | undefined): 'pending' | 'approved' | 'rejected' {
	if (!guide) return 'pending';
	if (guide.approvalStatus) return guide.approvalStatus;
	return guide.isVisible ? 'approved' : 'pending';
}
