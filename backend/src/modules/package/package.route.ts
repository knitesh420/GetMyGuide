import express from 'express';
import { VerifyMinLevel, VerifySession, VerifySessionOptional } from '../../middleware';
import IDValidator from '../../middleware/idValidator';
import Controller from './package.controller';
import { parsePackageFormData } from './package.middleware';
import {
	CreatePackageValidator,
	UpdatePackageValidator,
	UpdateStatusValidator,
} from './package.validator';

const router = express.Router();

// Public routes (with optional auth for admin access)
router.route('/').get(VerifySessionOptional, Controller.getPackages);
router.route('/available-cities').get(Controller.getAvailableCities);
router.route('/:id').get(VerifySessionOptional, IDValidator, Controller.getPackageById);

// Admin-only routes
router
	.route('/')
	.post(
		VerifySession,
		VerifyMinLevel('admin'),
		parsePackageFormData,
		CreatePackageValidator,
		Controller.createPackage
	);

router
	.route('/:id')
	.patch(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		parsePackageFormData,
		UpdatePackageValidator,
		Controller.updatePackage
	)
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.deletePackage);

router
	.route('/:id/update-status')
	.post(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		UpdateStatusValidator,
		Controller.updatePackageStatus
	);

export default router;
