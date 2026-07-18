import express from 'express';
import idempotency from '../../middleware/idempotency';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './guide.controller';
import {
	parseGuideProfileFormData,
	parseIdentityDocumentUpload,
	parseProfilePhotoUpload,
} from './guide.middleware';
import {
	ContactInquiryValidator,
	GuideAdminNotesValidator,
	GuideBankDetailsValidator,
	GuidePricingValidator,
	GuideProfilePatchValidator,
	GuideProfileValidator,
	GuideRejectValidator,
	MembershipConfirmPaymentValidator,
} from './guide.validator';

const router = express.Router();

// The `guides` collection is the sole source of guide data. The retired
// GuideEnrollment model (anonymous enrol-and-pay flow) has been removed: its
// `type`, `pan`, `licence` and `aadhar` were backfilled onto Guide by
// scripts/backfillGuideFromEnrollment.ts, so nothing reads it any more.

// Guide profile & availability (authenticated guide)
//
// PUT  = one-time registration, multipart (KYC profile + files).
// PATCH = post-registration edit, JSON, limited to phone/city/type/languages.
//         Rejected with 400 until the guide has registered via PUT.
router
	.route('/profile')
	.get(VerifySession, Controller.getGuideProfile)
	.put(
		VerifySession,
		VerifyMinLevel('guide'),
		parseGuideProfileFormData,
		GuideProfileValidator,
		Controller.updateGuideProfile
	)
	.patch(
		VerifySession,
		VerifyMinLevel('guide'),
		GuideProfilePatchValidator,
		Controller.patchGuideProfile
	);
router.route('/availability').put(VerifySession, Controller.updateAvailability);

// ---- Guide self-service profile assets (post-registration) ----------------
// A registered guide manages their profile photo and their two identity
// documents (Aadhaar, Guide Licence) individually, without re-running the
// one-time PUT registration above. All are the guide's own to change, so they
// sit behind the guide session only.
router
	.route('/profile/photo')
	.put(VerifySession, VerifyMinLevel('guide'), parseProfilePhotoUpload, Controller.updateProfilePhoto)
	.delete(VerifySession, VerifyMinLevel('guide'), Controller.deleteProfilePhoto);

router
	.route('/profile/documents/:type')
	.put(
		VerifySession,
		VerifyMinLevel('guide'),
		parseIdentityDocumentUpload,
		Controller.uploadIdentityDocument
	)
	.delete(VerifySession, VerifyMinLevel('guide'), Controller.deleteIdentityDocument);

// The guide reading back their own identity document. Streamed from here rather
// than linked on Cloudinary: the asset is private, and a signed CDN URL would be
// a permanently-readable link to an identity document sitting in browser
// history. `?download=1` saves instead of rendering inline.
router
	.route('/profile/documents/:type/view')
	.get(VerifySession, VerifyMinLevel('guide'), Controller.viewOwnIdentityDocument);

// The calling guide's own membership/subscription history (newest first).
router
	.route('/subscription-history')
	.get(VerifySession, VerifyMinLevel('guide'), Controller.getSubscriptionHistory);

// ---- Guide membership (30-day recurring, account-first) -------------------
router
	.route('/membership/create-order')
	.post(VerifySession, VerifyMinLevel('guide'), idempotency, Controller.createMembershipOrder);
router
	.route('/membership/confirm-payment')
	.post(
		VerifySession,
		VerifyMinLevel('guide'),
		MembershipConfirmPaymentValidator,
		Controller.confirmMembershipPayment
	);

// ---- Guide rates & payout destination ------------------------------------
// Rates are what direct bookings (/tourguide) are priced from; bank details are
// where the admin sends a payout. Both are the guide's own to set.
router
	.route('/pricing')
	.put(VerifySession, VerifyMinLevel('guide'), GuidePricingValidator, Controller.updatePricing);

router
	.route('/bank-details')
	.put(VerifySession, VerifyMinLevel('guide'), GuideBankDetailsValidator, Controller.updateBankDetails);

// ---- The calling guide's own bookings ------------------------------------
// Registered before '/:id' so 'my-bookings' is not read as a guide id.
router.route('/my-bookings').get(VerifySession, VerifyMinLevel('guide'), Controller.getMyBookings);
router
	.route('/my-bookings/:id')
	.get(VerifySession, VerifyMinLevel('guide'), IDValidator, Controller.getMyBookingById);

// Public - get all approved guides. '/all-guides' is an alias the frontend also
// calls; both hit the same handler rather than drifting apart.
router.route('/all').get(Controller.getAllApprovedGuides);
router.route('/all-guides').get(Controller.getAllApprovedGuides);

// Admin only - list every guide (active + inactive) with profile, business
// code, and membership state for the admin management table.
router.route('/admin/all').get(VerifySession, VerifyMinLevel('admin'), Controller.getAllGuidesForAdmin);

// Admin only - the KYC review inbox: guides who have submitted documents and
// are waiting on a decision.
router
	.route('/admin/pending-approvals')
	.get(VerifySession, VerifyMinLevel('admin'), Controller.getPendingApprovals);

// Admin only - one guide in full: profile, documents, internal notes, and the
// money (membership transactions with their Razorpay ids, bank details, refunds,
// cash payments). Registered AFTER the two literal '/admin/*' routes above so
// 'all' and 'pending-approvals' are not swallowed by the ':id' matcher.
router
	.route('/admin/:id')
	.get(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.getGuideDetailForAdmin);

// Admin only - the same guide-managed identity documents (Aadhaar, licence) the
// guide sees on their own profile, streamed for KYC review. Distinct from
// '/:id/documents/:index' above, which indexes the legacy positional store.
router
	.route('/admin/:id/identity-documents/:type')
	.get(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.viewGuideIdentityDocument);

// Contact inquiry routes
router.route('/contact-inquiry').post(ContactInquiryValidator, Controller.createContactInquiry);

// Admin only - list all contact inquiries
router
	.route('/contact-inquiries')
	.get(VerifySession, VerifyMinLevel('admin'), Controller.getContactInquiries);

// ---- Admin KYC decisions on a specific guide ------------------------------
// Before '/:id' so the verbs are not swallowed by the id matcher.
router
	.route('/:id/approve')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.approveGuide);

router
	.route('/:id/reject')
	.patch(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		GuideRejectValidator,
		Controller.rejectGuide
	);

// Admin only - reverse a suspension. The DELETE below is a soft delete that only
// clears `isActive`; this flips it back so a mistakenly-suspended guide can be
// restored without touching the database. Before '/:id' so it is not swallowed.
router
	.route('/:id/reactivate')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.reactivateGuide);

// Admin only - internal notes on a guide. Never readable by the guide themselves.
router
	.route('/:id/notes')
	.put(VerifySession, VerifyMinLevel('admin'), IDValidator, GuideAdminNotesValidator, Controller.updateAdminNotes);

// Admin only - view/download a KYC document (Aadhaar, driving licence).
//
// This exists because Guide.identityProofs holds bare filenames, not URLs: the
// admin panel was using them as hrefs, which resolved against the frontend
// origin and 404'd. Documents are private, so they are served from here behind
// an admin session rather than linked directly.
router
	.route('/:id/documents/:index')
	.get(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.downloadGuideDocument);

// Public — what this guide charges, and whether they can be booked directly.
router.route('/:id/pricing-details').get(IDValidator, Controller.getPricingDetails);

// Public GET + Admin DELETE for guide by ID
router
	.route('/:id')
	.get(IDValidator, Controller.getGuideByIdPublic)
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.deleteGuide);

export default router;
