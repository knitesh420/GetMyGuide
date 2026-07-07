import express from 'express';
import idempotency from '../../middleware/idempotency';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './guide.controller';
import { parseGuideEnrollmentFormData, parseGuideProfileFormData } from './guide.middleware';
import {
	ConfirmPaymentValidator,
	ContactInquiryValidator,
	EnrollValidator,
	GuideProfileValidator,
	MembershipConfirmPaymentValidator,
} from './guide.validator';

const router = express.Router();

// ---- Legacy anonymous KYC-and-pay enrollment ------------------------------
// Superseded by the account-first profile + membership flow below. Left
// mounted, untouched, in case of any in-flight Razorpay checkout sessions —
// safe to remove later once confirmed there's no more traffic.

// Public routes
router
	.route('/enroll')
	.post(parseGuideEnrollmentFormData, EnrollValidator, idempotency, Controller.enroll);

router.route('/enroll-status/:id').get(IDValidator, Controller.getEnrollStatus);

router
	.route('/confirm-payment')
	.post(ConfirmPaymentValidator, Controller.confirmPayment);

// Admin only - list all enrollments (includes PII + KYC document references)
router.route('/list-all').get(VerifySession, VerifyMinLevel('admin'), Controller.listAll);

// Guide profile & availability (authenticated guide)
router
	.route('/profile')
	.get(VerifySession, Controller.getGuideProfile)
	.put(
		VerifySession,
		VerifyMinLevel('guide'),
		parseGuideProfileFormData,
		GuideProfileValidator,
		Controller.updateGuideProfile
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
