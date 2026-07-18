import GuideService from '@services/guide';
import TourGuideService from '@services/tourguide';
import { uploadMulterImage } from '@utils/cloudinaryUpload';
import { originalDownloadUrl, signedDeliveryUrl } from '@utils/cloudinaryDelivery';
import { documentMimeType, localDocumentPath } from '@utils/guideDocuments';
import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { BadRequestError, NotFoundError, ServerError } from 'node-be-utilities';
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
						// KYC proofs go up as `authenticated`, not public: they can only be
						// delivered through the signed, admin-only download route below.
						uploadMulterImage(file, 'getmyguide/guides/identity-proofs', {
							type: 'authenticated',
						})
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

		// Same as registration: a self-service KYC document is private, delivered
		// only via a server-signed URL.
		const url = await uploadMulterImage(file, 'getmyguide/guides/identity-proofs', {
			type: 'authenticated',
		});
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
 * Pipe one stored KYC document back to the caller. Shared by the admin review
 * route and by the guide's own profile — they differ only in who is allowed
 * through, which their middleware has already settled by the time we get here.
 *
 * A stored document is either on Cloudinary (recent uploads) or on the API
 * server's local disk (older uploads). Neither is ever handed to the browser as
 * a URL:
 *
 *   - Cloudinary proofs are uploaded as `authenticated`, so their bare URL is a
 *     401, and even a signed one would sit in browser history readable by anyone
 *     who found it (`signedDeliveryUrl` mints no expiry). Streaming keeps the
 *     session as the only key.
 *   - PDFs cannot be fetched from the CDN at all while the account's "Allow
 *     delivery of PDF and ZIP files" setting is off — signed or not, it is 401.
 *     So we fetch through the Admin API download endpoint, which is not subject
 *     to that gate. See `originalDownloadUrl`.
 */
async function streamStoredDocument(
	res: Response,
	next: NextFunction,
	document: { value: string; storage: 'remote' | 'local'; label: string },
	asAttachment: boolean
) {
	const filename = `${document.label.replace(/\s+/g, '-').toLowerCase()}${document.value.slice(document.value.lastIndexOf('.'))}`;
	const disposition = `${asAttachment ? 'attachment' : 'inline'}; filename="${filename}"`;

	if (document.storage === 'remote') {
		// Prefer the download endpoint (works for PDFs regardless of the account
		// delivery setting); fall back to a signed CDN URL for anything it cannot
		// address, such as a stored value with no file extension.
		const source = originalDownloadUrl(document.value) ?? signedDeliveryUrl(document.value);

		let upstream;
		try {
			upstream = await axios.get<NodeJS.ReadableStream>(source, {
				responseType: 'stream',
				// Read Cloudinary's own status rather than throwing on 4xx, so a
				// 401 can be turned into an actionable message below.
				validateStatus: () => true,
				timeout: 20000,
			});
		} catch {
			return next(
				new ServerError('Could not reach the document store. Please try again in a moment.')
			);
		}

		if (upstream.status !== 200) {
			// Reaching a 401 here now means the API credentials are wrong or the
			// asset's delivery type does not match what its URL says — not the PDF
			// gate, which this path routes around.
			if (upstream.status === 401) {
				return next(
					new ServerError(
						`The ${document.label} could not be fetched from the document store (401). Check the Cloudinary API credentials on this server.`
					)
				);
			}
			return next(
				new NotFoundError(
					`The ${document.label} is no longer available from the document store (status ${upstream.status}). Ask the guide to re-upload it.`
				)
			);
		}

		const headers: Record<string, string> = {
			'Content-Type':
				(upstream.headers['content-type'] as string) || documentMimeType(document.value),
			'Content-Disposition': disposition,
			// KYC documents must never be held by a shared cache.
			'Cache-Control': 'private, no-store',
		};
		const contentLength = upstream.headers['content-length'];
		if (contentLength) headers['Content-Length'] = String(contentLength);

		res.writeHead(200, headers);
		return (upstream.data as NodeJS.ReadableStream).pipe(res);
	}

	const filePath = localDocumentPath(document.value);
	if (!fs.existsSync(filePath)) {
		// The row points at a file the server no longer has — almost certainly a
		// pre-Cloudinary upload lost to a redeploy. Say so, rather than leaving
		// the reader staring at a bare 404: the fix is a re-upload, and only a
		// specific message gets them there.
		return next(
			new NotFoundError(
				`The ${document.label} file is no longer on the server. It needs to be re-uploaded from the guide profile.`
			)
		);
	}

	const stat = fs.statSync(filePath);

	res.writeHead(200, {
		'Content-Length': stat.size,
		// The generic /media route has no PDF entry and falls back to
		// octet-stream, so a scanned Aadhaar downloaded instead of opening.
		'Content-Type': documentMimeType(document.value),
		'Content-Disposition': disposition,
		// KYC documents must never be held by a shared cache.
		'Cache-Control': 'private, no-store',
	});

	return fs.createReadStream(filePath).pipe(res);
}

function wantsAttachment(req: Request): boolean {
	return req.query.download === '1' || req.query.download === 'true';
}

/**
 * Stream a guide's KYC document to an admin, addressed by its position in the
 * legacy `identityProofs` array. `?download=1` forces a save dialog; without it
 * the browser renders the PDF/image inline.
 */
async function downloadGuideDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const index = Number.parseInt(req.params.index as string, 10);
		if (!Number.isInteger(index) || index < 0) {
			return next(new BadRequestError('Document index must be a non-negative integer'));
		}

		const document = await GuideService.getGuideDocument(req.params.id as string, index);

		return await streamStoredDocument(res, next, document, wantsAttachment(req));
	} catch (error) {
		return next(error);
	}
}

/**
 * The calling guide's own Aadhaar / licence, streamed back to them. This is what
 * the View button on the guide profile page points at — it never links to
 * Cloudinary, so the document is readable only with the guide's session.
 */
async function viewOwnIdentityDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const user = req.locals.user;
		if (!user || !user.userId) {
			return next(new BadRequestError('User not authenticated'));
		}

		const type = parseDocumentType(req.params.type);
		const document = await GuideService.getOwnIdentityDocument(user.userId, type);

		return await streamStoredDocument(res, next, document, wantsAttachment(req));
	} catch (error) {
		return next(error);
	}
}

/** The same document, for an admin reviewing that guide's KYC. */
async function viewGuideIdentityDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const type = parseDocumentType(req.params.type);
		const document = await GuideService.getIdentityDocumentForAdmin(
			req.params.id as string,
			type
		);

		return await streamStoredDocument(res, next, document, wantsAttachment(req));
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
	viewOwnIdentityDocument,
	viewGuideIdentityDocument,
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
