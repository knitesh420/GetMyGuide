import express from 'express';
import multer from 'multer';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './location.controller';
import {
	LocationCreateValidator,
	LocationListQueryValidator,
	LocationUpdateValidator,
} from './location.validator';

const router = express.Router();

// The admin panel posts a location as multipart with one image file; the
// controller pushes the buffer to Cloudinary. Memory storage, as in /package.
const upload = multer({ storage: multer.memoryStorage() });

// Admin listing (includes inactive) — before '/:id' so it isn't read as an id.
router.route('/admin/all').get(VerifySession, VerifyMinLevel('admin'), Controller.getAllForAdmin);

router
	.route('/')
	.get(LocationListQueryValidator, Controller.getAll)
	.post(
		VerifySession,
		VerifyMinLevel('admin'),
		upload.single('image'),
		LocationCreateValidator,
		Controller.create
	);

router
	.route('/:id')
	// No IDValidator on GET: the public location page routes by slug, not ObjectId.
	.get(Controller.getById)
	.patch(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		upload.single('image'),
		LocationUpdateValidator,
		Controller.update
	)
	// PUT is an alias for PATCH — the admin panel's update thunk uses PUT.
	.put(
		VerifySession,
		VerifyMinLevel('admin'),
		IDValidator,
		upload.single('image'),
		LocationUpdateValidator,
		Controller.update
	)
	.delete(VerifySession, VerifyMinLevel('admin'), IDValidator, Controller.remove);

export default router;
