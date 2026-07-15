import GuideService from '@services/guide';
import TourGuideService from '@services/tourguide';
import { uploadMulterImage } from '@utils/cloudinaryUpload';
import { documentMimeType, localDocumentPath } from '@utils/guideDocuments';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { BadRequestError, NotFoundError } from 'node-be-utilities';
import { Respond } from '@utils/respond';
import {
	GuideAdminNotesValidationResult,
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

async function reactivateGuide(req: Request, res: Response, next: NextFunction) {
	try {
		const guideId = req.locals.id!;

		const result = await GuideService.reactivateGuide(guideId);

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

		// Both the profile photo and the identity proofs go to Cloudinary and are
		// stored as URLs.
		//
		// Identity proofs used to stay on the API server's local disk as bare
		// filenames. That was fragile in two ways: the filename is not a URL, so the
		// admin panel's links 404'd; and the file lives on a container filesystem
		// that does not survive a redeploy. Proofs uploaded before this change are
		// still on disk and still served — the admin document route below falls back
		// to streaming them from `static/misc`.
		const profileImageFile = files?.profileImage?.[0];
		const profileImage = profileImageFile
			? await uploadMulterImage(profileImageFile, 'getmyguide/guides')
			: undefined;

		const identityProofs = files?.identityProofs?.length
			? await Promise.all(
					files.identityProofs.map((file) =>
						uploadMulterImage(file, 'getmyguide/guides/identity-proofs')
					)
				)
			: undefined;

		const profile = await GuideService.upsertGuideProfile(user.userId, data, {
			profileImage,
			identityProofs,
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

/**
 * The two document slots a guide manages themselves. Anything else on `:type`
 * is a 400 rather than silently writing an unknown key.
 */
const IDENTITY_DOCUMENT_TYPES = ['aadhaar', 'guideLicence'] as const;
type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

function parseDocumentType(value: unknown): IdentityDocumentType {
	if (typeof value === 'string' && (IDENTITY_DOCUMENT_TYPES as readonly string[]).includes(value)) {
		return value as IdentityDocumentType;
	}
	throw new BadRequestError('Document type must be either "aadhaar" or "guideLicence"');
}

async function updateProfilePhoto(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const file = req.file;
		if (!file) {
			return next(new BadRequestError('No image file was uploaded'));
		}

		const url = await uploadMulterImage(file, 'getmyguide/guides');
		const profile = await GuideService.updateProfilePhoto(user.userId, url);

		return Respond({ res, status: 200, data: profile });
	} catch (error) {
		return next(error);
	}
}

async function deleteProfilePhoto(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const profile = await GuideService.deleteProfilePhoto(user.userId);
		return Respond({ res, status: 200, data: profile });
	} catch (error) {
		return next(error);
	}
}

async function uploadIdentityDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const type = parseDocumentType(req.params.type);
		const file = req.file;
		if (!file) {
			return next(new BadRequestError('No document file was uploaded'));
		}

		const url = await uploadMulterImage(file, 'getmyguide/guides/identity-proofs');
		const profile = await GuideService.upsertIdentityDocument(user.userId, type, {
			url,
			storage: 'remote',
			mimeType: file.mimetype,
			originalName: file.originalname,
			size: file.size,
			uploadedAt: new Date(),
		});

		return Respond({ res, status: 200, data: profile });
	} catch (error) {
		return next(error);
	}
}

async function deleteIdentityDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const type = parseDocumentType(req.params.type);
		const profile = await GuideService.deleteIdentityDocument(user.userId, type);
		return Respond({ res, status: 200, data: profile });
	} catch (error) {
		return next(error);
	}
}

async function getSubscriptionHistory(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const history = await GuideService.getSubscriptionHistory(user.userId);
		return Respond({ res, status: 200, data: history });
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

// ---- Admin: one guide, in full -------------------------------------------
// Payment identifiers, bank details and internal notes are returned ONLY here,
// and this route is behind VerifyMinLevel('admin').

async function getGuideDetailForAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const detail = await GuideService.getGuideDetailForAdmin(req.params.id as string);
		return Respond({ res, status: 200, data: detail });
	} catch (error) {
		return next(error);
	}
}

async function updateAdminNotes(req: Request, res: Response, next: NextFunction) {
	try {
		const { notes } = req.locals.data as GuideAdminNotesValidationResult;
		const result = await GuideService.updateAdminNotes(
			req.params.id as string,
			notes,
			req.locals.user!.userId
		);

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

/**
 * Stream a guide's KYC document to an admin. `?download=1` forces a save dialog;
 * without it the browser renders the PDF/image inline.
 *
 * This is the only way to read an identity proof. The documents themselves are
 * either on Cloudinary (recent uploads — we redirect) or on the API server's
 * local disk (older uploads — we stream them). Either way the caller has been
 * through VerifySession + VerifyMinLevel('admin') to get here.
 */
async function downloadGuideDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const index = Number.parseInt(req.params.index as string, 10);
		if (!Number.isInteger(index) || index < 0) {
			return next(new BadRequestError('Document index must be a non-negative integer'));
		}

		const document = await GuideService.getGuideDocument(req.params.id as string, index);
		const asAttachment = req.query.download === '1' || req.query.download === 'true';

		if (document.storage === 'remote') {
			return res.redirect(document.value);
		}

		const filePath = localDocumentPath(document.value);
		if (!fs.existsSync(filePath)) {
			// The row points at a file the server no longer has — almost certainly a
			// pre-Cloudinary upload lost to a redeploy. Say so, rather than leaving
			// the admin staring at a bare 404: the fix is to ask the guide to
			// re-upload, and only a specific message gets them there.
			return next(
				new NotFoundError(
					`The ${document.label} file is no longer on the server. Ask the guide to re-upload it from their profile.`
				)
			);
		}

		const stat = fs.statSync(filePath);
		const filename = `${document.label.replace(/\s+/g, '-').toLowerCase()}${document.value.slice(document.value.lastIndexOf('.'))}`;

		res.writeHead(200, {
			'Content-Length': stat.size,
			// The generic /media route has no PDF entry and falls back to
			// octet-stream, so a scanned Aadhaar downloaded instead of opening.
			'Content-Type': documentMimeType(document.value),
			'Content-Disposition': `${asAttachment ? 'attachment' : 'inline'}; filename="${filename}"`,
			// KYC documents must never be held by a shared cache.
			'Cache-Control': 'private, no-store',
		});

		return fs.createReadStream(filePath).pipe(res);
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
	reactivateGuide,
	getGuideProfile,
	updateGuideProfile,
	patchGuideProfile,
	updateProfilePhoto,
	deleteProfilePhoto,
	uploadIdentityDocument,
	deleteIdentityDocument,
	getSubscriptionHistory,
	createMembershipOrder,
	confirmMembershipPayment,
	updateAvailability,
	getAllApprovedGuides,
	getAllGuidesForAdmin,
	getGuideByIdPublic,
	getGuideDetailForAdmin,
	updateAdminNotes,
	downloadGuideDocument,
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
