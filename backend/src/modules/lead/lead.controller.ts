import { NextFunction, Request, Response } from 'express';
import { Respond } from 'node-be-utilities';
import ContactInquiryDB from '@mongo/repo/ContactInquiry';
import { CreateContactInquiryValidationResult } from './lead.validator';

async function createContactInquiry(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as CreateContactInquiryValidationResult;

		const inquiry = await ContactInquiryDB.create({
			fullName: data.fullName,
			email: data.email,
			phoneNumber: data.phoneNumber,
			nationality: data.nationality,
			category: data.category,
			subject: data.subject,
			message: data.message,
			...(data.serviceName && { serviceName: data.serviceName }),
			status: 'pending',
		});

		return Respond({
			res,
			status: 201,
			data: {
				id: inquiry._id,
				message: 'Contact inquiry submitted successfully. We will get back to you soon.',
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getAllContactInquiries(req: Request, res: Response, next: NextFunction) {
	try {
		const { status, category, page = '1', limit = '10' } = req.query;

		const filter: any = {};
		if (status) filter.status = status;
		if (category) filter.category = category;

		const pageNum = parseInt(page as string);
		const limitNum = parseInt(limit as string);
		const skip = (pageNum - 1) * limitNum;

		const [inquiries, total] = await Promise.all([
			ContactInquiryDB.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
			ContactInquiryDB.countDocuments(filter),
		]);

		return Respond({
			res,
			status: 200,
			data: {
				inquiries,
				pagination: {
					total,
					page: pageNum,
					limit: limitNum,
					totalPages: Math.ceil(total / limitNum),
				},
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getContactInquiryById(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.params;

		const inquiry = await ContactInquiryDB.findById(id).lean();

		if (!inquiry) {
			return Respond({
				res,
				status: 404,
				data: {
					message: 'Contact inquiry not found',
				},
			});
		}

		return Respond({
			res,
			status: 200,
			data: {
				inquiry,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function updateInquiryStatus(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.params;
		const { status } = req.body;

		if (!['pending', 'reviewed', 'resolved'].includes(status)) {
			return Respond({
				res,
				status: 400,
				data: {
					message: 'Invalid status. Must be one of: pending, reviewed, resolved',
				},
			});
		}

		const inquiry = await ContactInquiryDB.findByIdAndUpdate(id, { status }, { new: true }).lean();

		if (!inquiry) {
			return Respond({
				res,
				status: 404,
				data: {
					message: 'Contact inquiry not found',
				},
			});
		}

		return Respond({
			res,
			status: 200,
			data: {
				inquiry,
				message: 'Inquiry status updated successfully',
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function deleteContactInquiry(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.params;

		const inquiry = await ContactInquiryDB.findByIdAndDelete(id);

		if (!inquiry) {
			return Respond({
				res,
				status: 404,
				data: {
					message: 'Contact inquiry not found',
				},
			});
		}

		return Respond({
			res,
			status: 200,
			data: {
				message: 'Contact inquiry deleted successfully',
			},
		});
	} catch (error) {
		return next(error);
	}
}

const LeadController = {
	createContactInquiry,
	getAllContactInquiries,
	getContactInquiryById,
	updateInquiryStatus,
	deleteContactInquiry,
};

export default LeadController;
