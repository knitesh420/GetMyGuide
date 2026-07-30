import express from 'express';
import { rateLimit, VerifyMinLevel, VerifySession } from '../../middleware';
import IDValidator from '../../middleware/idValidator';
import LeadController from './lead.controller';
import { CreateContactInquiryValidator } from './lead.validator';

const router = express.Router();

// This is the only unauthenticated write endpoint on the lead module: no
// session, no captcha, and one row inserted per call. Without a limiter a
// single client can insert unbounded rows into `contactinquiries`, which both
// grows the collection without bound and buries genuine enquiries in the admin
// queue. Ten per hour per IP is far above what a real visitor needs (the form is
// submitted once) and low enough to make scripted flooding pointless.
//
// Keyed on IP alone rather than IP+email, unlike the session limiters: the email
// here is attacker-chosen free text, so including it would let one client rotate
// it to get a fresh bucket per request.
const contactInquiryLimiter = rateLimit({
	prefix: 'lead-contact',
	windowSeconds: 60 * 60,
	max: 10,
});

// Public routes - Anyone can submit a contact inquiry
router
	.route('/contact')
	.post(contactInquiryLimiter, CreateContactInquiryValidator, LeadController.createContactInquiry);

// Admin routes - Only admins can view and manage inquiries
router
	.route('/contact')
	.get(VerifySession, VerifyMinLevel('admin'), LeadController.getAllContactInquiries);

router
	.route('/contact/:id')
	.get(VerifySession, VerifyMinLevel('admin'), IDValidator, LeadController.getContactInquiryById);

router
	.route('/contact/:id/status')
	.patch(VerifySession, VerifyMinLevel('admin'), IDValidator, LeadController.updateInquiryStatus);

router
	.route('/contact/:id')
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, LeadController.deleteContactInquiry);

export default router;
