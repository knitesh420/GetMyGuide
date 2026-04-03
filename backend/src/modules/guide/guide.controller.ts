import GuideService from '@services/guide';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError, Respond } from 'node-be-utilities';
import { ConfirmPaymentValidationResult, EnrollValidationResult } from './guide.validator';

async function enroll(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as EnrollValidationResult;

		// Get uploaded files from multer (already processed by parseGuideEnrollmentFormData middleware)
		const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

		if (!files) {
			return next(new BadRequestError('Files are required'));
		}

		// Validate required files
		if (!files.licence || files.licence.length === 0) {
			return next(new BadRequestError('Licence PDF file is required'));
		}

		if (!files.aadhar || files.aadhar.length === 0) {
			return next(new BadRequestError('Aadhar PDF file is required'));
		}

		if (!files.photo || files.photo.length === 0) {
			return next(new BadRequestError('Photo image file is required'));
		}

		const licenceFile = files.licence[0];
		const aadharFile = files.aadhar[0];
		const photoFile = files.photo[0];

		// Validate file types
		if (licenceFile.mimetype !== 'application/pdf') {
			return next(new BadRequestError('Licence must be a PDF file'));
		}

		if (aadharFile.mimetype !== 'application/pdf') {
			return next(new BadRequestError('Aadhar must be a PDF file'));
		}

		const allowedImageTypes = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
		if (!allowedImageTypes.includes(photoFile.mimetype)) {
			return next(new BadRequestError('Photo must be a JPG, PNG, or WEBP image'));
		}
		// Create enrollment using service
		const result = await GuideService.enroll({
			...data,
			licence: licenceFile.filename,
			aadhar: aadharFile.filename,
			photo: photoFile.filename,
		});
		return Respond({
			res,
			status: 201,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function listAll(req: Request, res: Response, next: NextFunction) {
	try {
		const query = req.query.query as string | undefined;
		const enrollments = await GuideService.getAllEnrollments(query);

		return Respond({
			res,
			status: 200,
			data: {
				enrollments,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getEnrollStatus(req: Request, res: Response, next: NextFunction) {
	try {
		const enrollmentId = req.locals.id!;
		const enrollment = await GuideService.getEnrollmentById(enrollmentId);

		return Respond({
			res,
			status: 200,
			data: enrollment,
		});
	} catch (error) {
		return next(error);
	}
}

async function confirmPayment(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as ConfirmPaymentValidationResult;

		const result = await GuideService.confirmPayment({
			transaction_id: data.transaction_id,
			razorpay_order_id: data.razorpay_order_id,
			razorpay_payment_id: data.razorpay_payment_id,
			razorpay_signature: data.razorpay_signature,
			enrollment_data: data.enrollment_data,
		});

		return Respond({
			res,
			status: 201,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function createContactInquiry(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data;

		const inquiry = await GuideService.createContactInquiry(data);

		return Respond({
			res,
			status: 201,
			data: {
				message: 'Contact inquiry submitted successfully',
				inquiry,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getContactInquiries(req: Request, res: Response, next: NextFunction) {
	try {
		const { category, status } = req.query;

		const filter: { category?: string; status?: string } = {};

		if (category && typeof category === 'string') {
			filter.category = category;
		}

		if (status && typeof status === 'string') {
			filter.status = status;
		}

		const inquiries = await GuideService.getAllContactInquiries(filter);

		return Respond({
			res,
			status: 200,
			data: {
				inquiries,
				total: inquiries.length,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function deleteGuide(req: Request, res: Response, next: NextFunction) {
	try {
		const guideId = req.locals.id!;

		const result = await GuideService.deactivateGuide(guideId);

		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function deleteEnrollment(req: Request, res: Response, next: NextFunction) {
	try {
		const enrollmentId = req.locals.id!;

		const result = await GuideService.deleteEnrollment(enrollmentId);

		return Respond({
			res,
			status: 200,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function getGuideProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const profile = await GuideService.getGuideProfile(user.userId);

		return Respond({
			res,
			status: 200,
			data: profile,
		});
	} catch (error) {
		return next(error);
	}
}

async function updateAvailability(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const { unavailableDates } = req.body;
		if (!Array.isArray(unavailableDates)) {
			return next(new BadRequestError('unavailableDates must be an array'));
		}

		const profile = await GuideService.updateAvailability(user.userId, unavailableDates);

		return Respond({
			res,
			status: 200,
			data: profile,
		});
	} catch (error) {
		return next(error);
	}
}

async function getAllApprovedGuides(req: Request, res: Response, next: NextFunction) {
	try {
		const { location, language, page, limit, search } = req.query;

		const result = await GuideService.getAllApprovedGuides({
			location: location as string,
			language: language as string,
			page: page ? parseInt(page as string) : undefined,
			limit: limit ? parseInt(limit as string) : undefined,
			search: search as string,
		});

		return Respond({
			res,
			status: 200,
			data: {
				data: result.data,
				total: result.total,
				page: result.page,
				totalPages: result.totalPages,
			},
		});
	} catch (error) {
		return next(error);
	}
}

async function getGuideByIdPublic(req: Request, res: Response, next: NextFunction) {
	try {
		const guideId = req.params.id as string;
		const guide = await GuideService.getGuideById(guideId);

		return Respond({
			res,
			status: 200,
			data: guide,
		});
	} catch (error) {
		return next(error);
	}
}

async function getMyGuideEnrollment(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;

		if (!user || !user.email) {
			return next(new BadRequestError('User not authenticated'));
		}

		const enrollment = await GuideService.getMyGuideEnrollment(user.email);

		return Respond({
			res,
			status: 200,
			data: enrollment as any,
		});
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	enroll,
	listAll,
	getEnrollStatus,
	confirmPayment,
	createContactInquiry,
	getContactInquiries,
	deleteGuide,
	deleteEnrollment,
	getMyGuideEnrollment,
	getGuideProfile,
	updateAvailability,
	getAllApprovedGuides,
	getGuideByIdPublic,
};

export default Controller;
