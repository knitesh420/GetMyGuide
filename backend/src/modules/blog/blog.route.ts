import express from 'express';
import { VerifyMinLevel, VerifySession } from '../../middleware';
import IDValidator from '../../middleware/idValidator';
import Controller from './blog.controller';
import { parseBlogFormData } from './blog.middleware';
import { CreateBlogValidator } from './blog.validator';

const router = express.Router();

// Public routes
router.route('/').get(Controller.getBlogs);
router.route('/:id').get(IDValidator, Controller.getBlogById);

// Admin-only routes
router
	.route('/')
	.post(
		VerifySession,
		VerifyMinLevel('admin'),
		parseBlogFormData,
		CreateBlogValidator,
		Controller.createBlog
	);

export default router;
