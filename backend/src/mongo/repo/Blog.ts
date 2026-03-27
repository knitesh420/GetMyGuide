import mongoose from 'mongoose';
import IBlog from '../types/blog';

const BlogSchema = new mongoose.Schema<IBlog>(
	{
		videoFilename: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			required: true,
			trim: true,
		},
		hasImage: {
			type: Boolean,
			required: true,
			default: false,
		},
		imageFilename: {
			type: String,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

const BlogDB = mongoose.model<IBlog>('Blog', BlogSchema);

export default BlogDB;
