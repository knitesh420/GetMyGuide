import BlogService from '@services/blog';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { BadRequestError, Respond } from 'node-be-utilities';
import { Path } from '@config/const';
import { CreateBlogValidationResult } from './blog.validator';

async function createBlog(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as CreateBlogValidationResult;

		// Get uploaded files from multer (already processed by parseBlogFormData middleware)
		const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

		if (!files || !files.video || files.video.length === 0) {
			return next(new BadRequestError('Video file is required'));
		}

		const videoFile = files.video[0];

		// Validate video file type
		if (!videoFile.mimetype.startsWith('video/')) {
			return next(new BadRequestError('Only video files are allowed for video field'));
		}

		// Check if image is provided when hasImage is true
		let imageFilename: string | undefined;
		if (data.hasImage) {
			if (!files.image || files.image.length === 0) {
				return next(new BadRequestError('Image file is required when hasImage is true'));
			}

			const imageFile = files.image[0];

			// Validate image file type
			const allowedImageTypes = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
			if (!allowedImageTypes.includes(imageFile.mimetype)) {
				return next(new BadRequestError('Only JPG, PNG, WEBP images are allowed for image field'));
			}

			imageFilename = imageFile.filename;
		}

		// Create blog entry using service
		const blog = await BlogService.createBlog({
			videoFilename: videoFile.filename,
			description: data.description,
			hasImage: data.hasImage,
			imageFilename: imageFilename,
		});

		// Move files from static/misc to static/blogs after successful creation
		const blogsDir = path.join(global.__basedir, Path.Blogs);
		const miscDir = path.join(global.__basedir, Path.Misc);

		// Move video file
		const videoSourcePath = path.join(miscDir, videoFile.filename);
		const videoDestPath = path.join(blogsDir, videoFile.filename);
		await fs.rename(videoSourcePath, videoDestPath);

		// Move image file if it exists
		if (imageFilename) {
			const imageSourcePath = path.join(miscDir, imageFilename);
			const imageDestPath = path.join(blogsDir, imageFilename);
			await fs.rename(imageSourcePath, imageDestPath);
		}

		return Respond({
			res,
			status: 201,
			data: blog,
		});
	} catch (error) {
		return next(error);
	}
}

async function getBlogs(req: Request, res: Response, next: NextFunction) {
	try {
		const blogs = await BlogService.getAllBlogs();

		return Respond({
			res,
			status: 200,
			data: {
				blogs,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getBlogById(req: Request, res: Response, next: NextFunction) {
	try {
		const blogId = req.locals.id!;
		const blog = await BlogService.getBlogById(blogId);

		return Respond({
			res,
			status: 200,
			data: blog,
		});
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	createBlog,
	getBlogs,
	getBlogById,
};

export default Controller;
