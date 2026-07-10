import express from 'express';
import idempotency from '../../middleware/idempotency';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './guide.controller';
import { parseGuideProfileFormData } from './guide.middleware';
import {
	ContactInquiryValidator,
	GuideProfilePatchValidator,
	GuideProfileValidator,
	MembershipConfirmPaymentValidator,
} from './guide.validator';

const router = express.Router();

// ---- Legacy enrollment records (read-only) --------------------------------
// The anonymous KYC-and-pay write path (enroll → Razorpay → confirm-payment)
// is gone: registration is now account-first via PUT /guide/profile below.
// GuideEnrollment documents are retained and still read — `getGuideProfile`
// falls back to them for the `type` of guides who predate the Guide model, so
// dropping them would silently downgrade legacy escort guides to normal. The
// read routes below are what the admin panel uses to review those records.

// Admin only - list all enrollments (includes PII + KYC document references)
router.route('/list-all').get(VerifySession, VerifyMinLevel('admin'), Controller.listAll);

// Admin only - read one enrollment. This was an unauthenticated route while the
// public enrol-and-pay flow needed to poll it; nothing polls it now, and it
// returns PII + KYC document references, so it is gated with the list above.
router
	.route('/enroll-status/:id')
	.get(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.getEnrollStatus);

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

// Public - get all approved guides
router.route('/all').get(Controller.getAllApprovedGuides);

// Contact inquiry routes
router.route('/contact-inquiry').post(ContactInquiryValidator, Controller.createContactInquiry);

// Admin only - list all contact inquiries
router
	.route('/contact-inquiries')
	.get(VerifySession, VerifyMinLevel('admin'), Controller.getContactInquiries);

// Protected route - get current user's guide enrollment
router.route('/me').get(VerifySession, Controller.getMyGuideEnrollment);

// Admin: delete an enrollment (before it becomes an account)
router
	.route('/enrollment/:id')
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.deleteEnrollment);

// Public GET + Admin DELETE for guide by ID
router
	.route('/:id')
	.get(IDValidator, Controller.getGuideByIdPublic)
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.deleteGuide);

export default router;
