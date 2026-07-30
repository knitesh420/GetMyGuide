import express from 'express';
import { VerifyMinLevel, VerifySession } from '../../middleware';
import IDValidator from '../../middleware/idValidator';
import Controller from './advertisement.controller';
import { parseAdvertisementFormData } from './advertisement.middleware';
import {
	CreateAdvertisementValidator,
	UpdateAdvertisementValidator,
} from './advertisement.validator';

const router = express.Router();

// Admin — get all (including inactive) — MUST be before /:id
router.get('/admin/all', VerifySession, VerifyMinLevel('admin'), Controller.getAllAdvertisements);

// Public
router.get('/', Controller.getAdvertisements);

// Admin — create
router.post(
	'/',
	VerifySession,
	VerifyMinLevel('admin'),
	parseAdvertisementFormData,
	CreateAdvertisementValidator,
	Controller.createAdvertisement
);

// Admin — toggle active — MUST be before /:id
router.patch(
	'/:id/toggle',
	VerifySession,
	VerifyMinLevel('admin'),
	IDValidator,
	Controller.toggleActive
);

// Admin — update video
router.patch(
	'/:id',
	VerifySession,
	VerifyMinLevel('admin'),
	IDValidator,
	parseAdvertisementFormData,
	UpdateAdvertisementValidator,
	Controller.updateAdvertisement
);

// Admin — delete
router.delete(
	'/:id',
	VerifySession,
	VerifyMinLevel('admin'),
	IDValidator,
	Controller.deleteAdvertisement
);

// Public — get by ID — MUST be last
router.get('/:id', IDValidator, Controller.getAdvertisementById);

export default router;
