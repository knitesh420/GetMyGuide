import GuideService from '@services/guide';
import { uploadMulterImage } from '@utils/cloudinaryUpload';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError, Respond } from 'node-be-utilities';
import {
	GuideProfilePatchValidationResult,
	GuideProfileValidationResult,
	MembershipConfirmPaymentValidationResult,
} from './guide.validator';

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

async function updateGuideProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const data = req.locals.data as GuideProfileValidationResult;
		const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

		// The profile photo is rendered by public/dashboard clients, so it lives on
		// Cloudinary and we store the URL. Identity proofs are private KYC docs and
		// stay on local disk, referenced by filename.
		const profileImageFile = files?.profileImage?.[0];
		const profileImage = profileImageFile
			? await uploadMulterImage(profileImageFile, 'getmyguide/guides')
			: undefined;

		const profile = await GuideService.upsertGuideProfile(user.userId, data, {
			profileImage,
			identityProofs: files?.identityProofs?.map((f) => f.filename),
		});

		return Respond({
			res,
			status: 200,
			data: profile,
		});
	} catch (error) {
		return next(error);
	}
}

async function patchGuideProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const data = req.locals.data as GuideProfilePatchValidationResult;
		const profile = await GuideService.patchGuideProfile(user.userId, data);

		return Respond({
			res,
			status: 200,
			data: profile,
		});
	} catch (error) {
		return next(error);
	}
}

async function createMembershipOrder(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const result = await GuideService.createMembershipOrder(user.userId);

		return Respond({
			res,
			status: 201,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
}

async function confirmMembershipPayment(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const data = req.locals.data as MembershipConfirmPaymentValidationResult;
		const result = await GuideService.confirmMembershipPayment(user.userId, data);

		return Respond({
			res,
			status: 200,
			data: result,
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
	listAll,
	getEnrollStatus,
	createContactInquiry,
	getContactInquiries,
	deleteGuide,
	deleteEnrollment,
	getMyGuideEnrollment,
	getGuideProfile,
	updateGuideProfile,
	patchGuideProfile,
	createMembershipOrder,
	confirmMembershipPayment,
	updateAvailability,
	getAllApprovedGuides,
	getGuideByIdPublic,
};

export default Controller;
