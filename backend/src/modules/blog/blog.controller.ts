import BlogService from '@services/blog';
import { Path } from '@config/const';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { BadRequestError, Respond } from 'node-be-utilities';
import { CreateBlogValidationResult } from './blog.validator';
import { extractYoutubeVideoId } from '@utils/youtube';

async function createBlog(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as CreateBlogValidationResult;

		const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

		let imageFilename: string | undefined;

		if (data.hasImage) {
			if (!files?.image || files.image.length === 0) {
				return next(new BadRequestError('Image file is required'));
			}

			imageFilename = files.image[0].filename;
		}

		const videoId = extractYoutubeVideoId(data.youtubeUrl);

		if (!videoId) {
			return next(new BadRequestError('Invalid YouTube URL'));
		}

		const blog = await BlogService.createBlog({
			videoId,
			description: data.description,
			hasImage: data.hasImage,
			imageFilename,
		});

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

async function deleteBlog(req: Request, res: Response, next: NextFunction) {
	try {
		const blogId = req.locals.id!;
		const blog = await BlogService.deleteBlog(blogId);

		if (blog.hasImage && blog.imageFilename) {
			const candidates = [
				path.join(global.__basedir, Path.Blogs, blog.imageFilename),
				path.join(global.__basedir, Path.Misc, blog.imageFilename),
			];
			for (const candidate of candidates) {
				try {
					await fs.unlink(candidate);
				} catch {
					// Ignore missing files — image may have been cleaned up already
				}
			}
		}

		return Respond({
			res,
			status: 200,
			data: { message: 'Blog deleted successfully' },
		});
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	createBlog,
	getBlogs,
	getBlogById,
	deleteBlog,
};

export default Controller;
