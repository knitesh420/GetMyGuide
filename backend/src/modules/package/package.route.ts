import express from 'express';
import multer from 'multer';

import { PackageController } from './package.controller';
import { CreatePackageValidator, UpdatePackageValidator } from './package.validator';

import VerifySession from '../../middleware/VerifySession';
import { VerifyMinLevel } from '../../middleware/VerifySession';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

/*
 PUBLIC
*/
router.get('/', PackageController.getPackages);

router.get('/:id', PackageController.getPackageById);

/*
 ADMIN ONLY
*/
router.post(
	'/',
	VerifySession,
	VerifyMinLevel('admin'),
	upload.array('images', 10),
	CreatePackageValidator,
	PackageController.createPackage
);

router.patch(
	'/:id',
	VerifySession,
	VerifyMinLevel('admin'),
	upload.array('images', 10),
	UpdatePackageValidator,
	PackageController.updatePackage
);

router.delete('/:id', VerifySession, VerifyMinLevel('admin'), PackageController.deletePackage);

export default router;
