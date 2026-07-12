import GuideService from '@services/guide';
import TourGuideService from '@services/tourguide';
import { uploadMulterImage } from '@utils/cloudinaryUpload';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { Respond } from '@utils/respond';
import {
	GuideBankDetailsValidationResult,
	GuidePricingValidationResult,
	GuideProfilePatchValidationResult,
	GuideProfileValidationResult,
	GuideRejectValidationResult,
	MembershipConfirmPaymentValidationResult,
} from './guide.validator';

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

async function getAllGuidesForAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const guides = await GuideService.getAllGuidesForAdmin();

		// Wrap the array under `data`: Respond() spreads its `data` onto the top
		// level of the body, so a bare array must not be passed straight to it.
		return Respond({
			res,
			status: 200,
			data: { data: guides },
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

// ---- Admin KYC review ------------------------------------------------------

async function approveGuide(req: Request, res: Response, next: NextFunction) {
	try {
		const guide = await GuideService.approveGuide(
			req.params.id as string,
			req.locals.user!.userId
		);

		return Respond({ res, status: 200, data: guide });
	} catch (error) {
		return next(error);
	}
}

async function rejectGuide(req: Request, res: Response, next: NextFunction) {
	try {
		const { reason } = req.locals.data as GuideRejectValidationResult;
		const guide = await GuideService.rejectGuide(
			req.params.id as string,
			reason,
			req.locals.user!.userId
		);

		return Respond({ res, status: 200, data: guide });
	} catch (error) {
		return next(error);
	}
}

async function getPendingApprovals(req: Request, res: Response, next: NextFunction) {
	try {
		const guides = await GuideService.getPendingApprovals();
		return Respond({ res, status: 200, data: guides });
	} catch (error) {
		return next(error);
	}
}

// ---- Rates & payout details ------------------------------------------------

async function getPricingDetails(req: Request, res: Response, next: NextFunction) {
	try {
		const pricing = await GuideService.getPricingDetails(req.params.id as string);
		return Respond({ res, status: 200, data: pricing });
	} catch (error) {
		return next(error);
	}
}

async function updatePricing(req: Request, res: Response, next: NextFunction) {
	try {
		const { halfDay, fullDay } = req.locals.data as GuidePricingValidationResult;
		const pricing = await GuideService.updatePricing(req.locals.user!.userId, {
			halfDay,
			fullDay,
		});

		return Respond({ res, status: 200, data: pricing });
	} catch (error) {
		return next(error);
	}
}

async function updateBankDetails(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.locals.data as GuideBankDetailsValidationResult;
		const bankDetails = await GuideService.updateBankDetails(req.locals.user!.userId, data);

		return Respond({ res, status: 200, data: bankDetails });
	} catch (error) {
		return next(error);
	}
}

// ---- The calling guide's own bookings --------------------------------------

async function getMyBookings(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await TourGuideService.getMyGuideBookings(req.locals.user!.userId);
		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMyBookingById(req: Request, res: Response, next: NextFunction) {
	try {
		const booking = await TourGuideService.getMyGuideBookingById(
			req.locals.user!.userId,
			req.params.id as string
		);

		return Respond({ res, status: 200, data: booking });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	createContactInquiry,
	getContactInquiries,
	deleteGuide,
	getGuideProfile,
	updateGuideProfile,
	patchGuideProfile,
	createMembershipOrder,
	confirmMembershipPayment,
	updateAvailability,
	getAllApprovedGuides,
	getAllGuidesForAdmin,
	getGuideByIdPublic,
	approveGuide,
	rejectGuide,
	getPendingApprovals,
	getPricingDetails,
	updatePricing,
	updateBankDetails,
	getMyBookings,
	getMyBookingById,
};

export default Controller;
