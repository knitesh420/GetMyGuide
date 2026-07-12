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

/*
 ADMIN ONLY

 Must be declared before '/:id', or Express matches 'admin' as an id.

 The public listing above hard-filters to status: 'active'. The admin panel
 cannot use it: hiding a service would drop it from the admin's own list too,
 leaving no way to ever bring it back. This route returns every package,
 whatever its status.
*/
router.get(
	'/admin/all',
	VerifySession,
	VerifyMinLevel('admin'),
	PackageController.getAllPackagesForAdmin
);

router.get('/:id', PackageController.getPackageById);

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
