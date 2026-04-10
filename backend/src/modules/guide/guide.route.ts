import express from 'express';
import idempotency from '../../middleware/idempotency';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './guide.controller';
import { parseGuideEnrollmentFormData } from './guide.middleware';
import {
	ConfirmPaymentValidator,
	ContactInquiryValidator,
	EnrollValidator,
} from './guide.validator';

const router = express.Router();

// Public routes
router
	.route('/enroll')
	.post(parseGuideEnrollmentFormData, EnrollValidator, idempotency, Controller.enroll);

router.route('/enroll-status/:id').get(IDValidator, Controller.getEnrollStatus);

router
	.route('/confirm-payment')
	.post(ConfirmPaymentValidator, Controller.confirmPayment);

// Public route - list all guides (no authentication required)
router.route('/list-all').get(Controller.listAll);

// Guide profile & availability (authenticated guide)
router.route('/profile').get(VerifySession, Controller.getGuideProfile);
router.route('/availability').put(VerifySession, Controller.updateAvailability);

// Public - get all approved guides
router.route('/all').get(Controller.getAllApprovedGuides);

// Contact inquiry routes
router.route('/contact-inquiry').post(ContactInquiryValidator, Controller.createContactInquiry);

router.route('/contact-inquiries').get(Controller.getContactInquiries);

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
