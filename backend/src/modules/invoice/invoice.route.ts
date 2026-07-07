import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './invoice.controller';
import { InvoiceExportQueryValidator, InvoiceListQueryValidator } from './invoice.validator';

const router = express.Router();

router.route('/').get(VerifySession, InvoiceListQueryValidator, Controller.list);

router
	.route('/admin/export')
	.get(VerifySession, VerifyMinLevel('admin'), InvoiceExportQueryValidator, Controller.exportInvoices);

router.route('/:id').get(VerifySession, IDValidator, Controller.getById);

router.route('/:id/download').get(VerifySession, IDValidator, Controller.download);

router.route('/:id/resend').post(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.resend);

export default router;
