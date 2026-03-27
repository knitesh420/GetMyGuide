import express from 'express';
import { VerifyMinLevel, VerifySession } from '../../middleware';
import IDValidator from '../../middleware/idValidator';
import LeadController from './lead.controller';
import { CreateContactInquiryValidator } from './lead.validator';

const router = express.Router();

// Public routes - Anyone can submit a contact inquiry
router.route('/contact').post(CreateContactInquiryValidator, LeadController.createContactInquiry);

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
