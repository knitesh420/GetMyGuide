import { BlogDB } from '@mongo';
import IBlog from '@mongo/types/blog';
import { Types } from 'mongoose';
import { NotFoundError } from 'node-be-utilities';

interface BlogData {
	videoFilename: string;
	description: string;
	hasImage: boolean;
	imageFilename?: string;
}

interface TransformedBlog {
	id: string;
	videoFilename: string;
	description: string;
	hasImage: boolean;
	imageFilename?: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Transform a blog document to API format
 * Converts _id to id
 */
function transformBlog(blog: IBlog): TransformedBlog {
	const transformed: TransformedBlog = {
		id: blog._id.toString(),
		videoFilename: blog.videoFilename,
		description: blog.description,
		hasImage: blog.hasImage,
		imageFilename: blog.imageFilename,
		createdAt: blog.createdAt,
		updatedAt: blog.updatedAt,
	};

	return transformed;
}

class BlogService {
	/**
	 * Create a new blog entry
	 */
	async createBlog(data: BlogData): Promise<TransformedBlog> {
		const blog = await BlogDB.create(data);
		return transformBlog(blog);
	}

	/**
	 * Get all blogs sorted by creation date (newest first)
	 */
	async getAllBlogs(): Promise<TransformedBlog[]> {
		const blogs = await BlogDB.find().sort({ createdAt: -1 }).lean();

		return blogs.map((blog) => transformBlog(blog as IBlog));
	}

	/**
	 * Get a blog by ID
	 */
	async getBlogById(blogId: Types.ObjectId): Promise<TransformedBlog> {
		const blog = await BlogDB.findById(blogId).lean();

		if (!blog) {
			throw new NotFoundError('Blog not found');
		}

		return transformBlog(blog as IBlog);
	}
}

export default new BlogService();
