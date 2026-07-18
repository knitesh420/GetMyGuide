import { GUIDE_MEMBERSHIP_DURATION_DAYS, GUIDE_MEMBERSHIP_FEE } from '@config/const';
import { AccountDB, ContactInquiryDB, GuideDB, InvoiceDB, TransactionDB } from '@mongo';
import IGuide, { GuideIdentityDocument, GuideIdentityDocumentType } from '@mongo/types/guide';
import ITransaction from '@mongo/types/transaction';
import { displayApprovalStatus, isGuideApproved } from '@utils/guideApproval';
import { describeGuideDocuments } from '@utils/guideDocuments';
import { activeMembershipFilter } from '@utils/guideMembership';
import { verifyRazorpaySignature } from '@utils/paymentVerify';
import { Types } from 'mongoose';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
	ServerError,
	error as logError,
} from 'node-be-utilities';
import ActivityLogService from './activityLog';
import CashPaymentService from './cashPayment';
import InvoiceService from './invoice';
import NotificationService from './notification';
import TransactionService from './transaction';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A guide who was never refunded still hydrates `membershipRefund` as `{}`, not
 * `undefined` — Mongoose always materialises a nested-object path. That empty
 * object is truthy, so a bare `guide.membershipRefund ?? null` hands the admin
 * panel a refund with no fields and it renders an empty "refund failed" block on
 * every guide who never had one. `status` is only ever set by an actual refund,
 * so it is what tells a real record from a phantom.
 */
function realRefund(guide: Pick<IGuide, 'membershipRefund'> | null | undefined) {
	return guide?.membershipRefund?.status ? guide.membershipRefund : null;
}

/**
 * Shape a stored identity document for a guide/admin response. Like
 * `realRefund`, this guards against Mongoose materialising an empty sub-document
 * (`{}` with no `url`) as if it were a real upload — a slot is only "filled"
 * once it has a `url`. Returns null for an empty/absent slot.
 */
export const IDENTITY_DOCUMENT_LABELS: Record<GuideIdentityDocumentType, string> = {
	aadhaar: 'Aadhaar Card',
	guideLicence: 'Guide Licence',
};

function publicIdentityDocument(
	doc: GuideIdentityDocument | undefined | null,
	/**
	 * Path (relative to the API origin) of the authenticated streaming route for
	 * this document. The frontend prefixes NEXT_PUBLIC_API_URL.
	 */
	viewPath: string
) {
	if (!doc?.url) return null;
	return {
		// Deliberately NOT the Cloudinary URL. A bare one is a 401 (these are
		// uploaded as `authenticated`), and a signed one carries no expiry, so
		// handing it to the browser would leave a permanently-readable link to an
		// identity document in history, screenshots and referrers. The route below
		// streams the bytes behind the caller's session instead — which is also the
		// only way to read a PDF at all while the Cloudinary account's PDF delivery
		// setting is off.
		url: viewPath,
		downloadUrl: `${viewPath}?download=1`,
		mimeType: doc.mimeType ?? null,
		originalName: doc.originalName ?? null,
		size: doc.size ?? null,
		uploadedAt: doc.uploadedAt ?? null,
	};
}

interface GuideProfileData {
	languages: string[];
	type: 'normal' | 'escort';
	phone: string;
	city: string;
	/** Escort guides only. */
	pan?: string;
}

interface GuideProfileFiles {
	profileImage?: string;
	identityProofs?: string[];
}

/**
 * The only fields a registered guide may change after registration. Everything
 * else on the profile is fixed at registration time.
 */
interface GuideProfilePatchData {
	phone?: string;
	city?: string;
	type?: 'normal' | 'escort';
	languages?: string[];
}

class GuideService {
	/**
	 * Create a new contact inquiry
	 */
	async createContactInquiry(data: {
		fullName: string;
		phoneNumber: string;
		email: string;
		nationality: string;
		category: 'tour booking' | 'become a guide' | 'other';
		subject: string;
		message: string;
	}): Promise<{
		id: string;
		fullName: string;
		email: string;
		category: string;
		status: string;
		createdAt: Date;
	}> {
		const inquiry = await ContactInquiryDB.create({
			fullName: data.fullName,
			phoneNumber: data.phoneNumber,
			email: data.email,
			nationality: data.nationality,
			category: data.category,
			subject: data.subject,
			message: data.message,
			status: 'pending',
		});

		return {
			id: inquiry._id.toString(),
			fullName: inquiry.fullName,
			email: inquiry.email,
			category: inquiry.category,
			status: inquiry.status,
			createdAt: inquiry.createdAt,
		};
	}

	/**
	 * Get all contact inquiries
	 */
	async getAllContactInquiries(filter?: { category?: string; status?: string }): Promise<
		Array<{
			id: string;
			fullName: string;
			phoneNumber: string;
			email: string;
			nationality: string;
			category: string;
			subject: string;
			message: string;
			status: string;
			createdAt: Date;
			updatedAt: Date;
		}>
	> {
		const query: any = {};

		if (filter?.category) {
			query.category = filter.category;
		}

		if (filter?.status) {
			query.status = filter.status;
		}

		const inquiries = await ContactInquiryDB.find(query).sort({ createdAt: -1 });

		return inquiries.map((inquiry: any) => ({
			id: inquiry._id.toString(),
			fullName: inquiry.fullName,
			phoneNumber: inquiry.phoneNumber,
			email: inquiry.email,
			nationality: inquiry.nationality,
			category: inquiry.category,
			subject: inquiry.subject,
			message: inquiry.message,
			status: inquiry.status,
			createdAt: inquiry.createdAt,
			updatedAt: inquiry.updatedAt,
		}));
	}

	/**
	 * Deactivate (soft delete) a guide account by ID
	 */
	async deactivateGuide(guideId: Types.ObjectId): Promise<{ message: string }> {
		const guide = await AccountDB.findOneAndUpdate(
			{ _id: guideId, role: 'guide' },
			{ isActive: false },
			{ new: true }
		);

		if (!guide) {
			throw new NotFoundError('Guide not found');
		}

		return {
			message: 'Guide account deactivated successfully',
		};
	}

	/**
	 * Reactivate a suspended guide account by ID — the reverse of
	 * deactivateGuide. Flips `isActive` back to true so the guide can log in and
	 * is visible on the site again. Deactivation is a soft delete that only
	 * clears this flag, so nothing else needs restoring.
	 */
	async reactivateGuide(guideId: Types.ObjectId): Promise<{ message: string }> {
		const guide = await AccountDB.findOneAndUpdate(
			{ _id: guideId, role: 'guide' },
			{ isActive: true },
			{ new: true }
		);

		if (!guide) {
			throw new NotFoundError('Guide not found');
		}

		return {
			message: 'Guide account reactivated successfully',
		};
	}

	/**
	 * Get guide profile (Account + Guide membership) for the current user
	 */
	async getGuideProfile(userId: string) {
		const account = await AccountDB.findOne({ _id: userId, role: 'guide' });
		if (!account) {
			throw new NotFoundError('Guide profile not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id });

		const now = new Date();
		const membershipExpired = !guide?.membershipExpiryDate || guide.membershipExpiryDate <= now;

		return {
			_id: account._id.toString(),
			user: account._id.toString(),
			// Human-facing business code (GU######) — null until backfilled.
			guideCode: guide?.guideCode ?? null,
			name: account.name,
			email: account.email,
			mobile: account.phone,
			countryCode: account.countryCode,
			languages: guide?.languages ?? [],
			city: guide?.city || '',
			pan: guide?.pan || '',
			profileImage: guide?.profileImage || '',
			identityProofs: guide?.identityProofs || [],
			// Structured, individually-managed KYC documents. Only the fields the
			// guide's own UI needs (never the admin-only audit trail). `null` for a
			// slot the guide has not uploaded yet.
			identityDocuments: {
				aadhaar: publicIdentityDocument(
					guide?.identityDocuments?.aadhaar,
					'/guides/profile/documents/aadhaar/view'
				),
				guideLicence: publicIdentityDocument(
					guide?.identityDocuments?.guideLicence,
					'/guides/profile/documents/guideLicence/view'
				),
			},
			// Legacy field names some existing frontend code still reads
			serviceLocations: guide?.city ? [guide.city] : [],
			photo: guide?.profileImage || '',
			isApproved: account.status === 'verified',
			type: guide?.type || 'normal',
			isCertified: guide?.type === 'escort',
			unavailableDates: account.unavailableDates || [],
			// Membership
			registrationCompleted: guide?.registrationCompleted || false,
			paymentStatus: guide?.paymentStatus || 'pending',
			isVisible: guide?.isVisible || false,
			membershipStartDate: guide?.membershipStartDate || null,
			membershipExpiryDate: guide?.membershipExpiryDate || null,
			membershipExpired,
			// Paid, but the subscription has not started because review is still
			// pending. The dashboard needs this to explain why a guide who has paid
			// is not live yet — without it they look simply broken.
			membershipPendingActivation: !!guide?.membershipPendingActivation,
			membershipPaidAt: guide?.membershipPaidAt ?? null,
			// The guide is told their fee came back; the internal audit fields
			// (which admin, which transaction) stay out of this response.
			membershipRefund: (() => {
				const refund = realRefund(guide);
				return refund
					? {
							status: refund.status,
							amount: refund.amount,
							refundedAt: refund.refundedAt,
						}
					: null;
			})(),
			profileComplete: !!guide?.registrationCompleted,
			// KYC review. The guide needs to see where they stand — and why, if
			// they were rejected — not just find themselves silently unlisted.
			approvalStatus: displayApprovalStatus(guide),
			rejectionReason: guide?.rejectionReason ?? '',
			approvedAt: guide?.approvedAt ?? null,
			// Own-profile read, so the payout destination is safe to return here.
			pricing: guide?.pricing ?? null,
			bankDetails: guide?.bankDetails ?? null,
		};
	}

	/**
	 * One-time guide registration: writes the KYC profile (languages, type,
	 * city, PAN, photo and identity documents) and flips
	 * `registrationCompleted`. Does not touch payment/visibility/membership
	 * fields — those only change via the membership payment flow below.
	 *
	 * Post-registration edits go through `patchGuideProfile`, which is limited
	 * to the four mutable fields.
	 */
	async upsertGuideProfile(
		accountId: string,
		data: GuideProfileData,
		files: GuideProfileFiles
	) {
		const account = await AccountDB.findOne({ _id: accountId, role: 'guide' });
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}

		const existing = await GuideDB.findOne({ accountId: account._id });

		// Profile image + identity proof are required on first submission only —
		// edits to an already-completed profile can omit files to keep the ones
		// already on record.
		if (!existing) {
			if (!files.profileImage) {
				throw new BadRequestError('Profile image is required');
			}
			if (!files.identityProofs || files.identityProofs.length === 0) {
				throw new BadRequestError('At least one identity proof document is required');
			}
		}

		// `phone` lives on the Account, not the Guide — pull it out so the
		// Guide update carries only Guide paths.
		const { phone, ...guideData } = data;

		const update: Record<string, unknown> = { ...guideData, registrationCompleted: true };
		if (files.profileImage) update.profileImage = files.profileImage;
		if (files.identityProofs?.length) update.identityProofs = files.identityProofs;

		if (existing) {
			await GuideDB.findOneAndUpdate({ accountId: account._id }, { $set: update });
		} else {
			await GuideDB.create({ accountId: account._id, ...update });
		}

		if (phone && phone !== account.phone) {
			await AccountDB.updateOne({ _id: account._id }, { $set: { phone } });
		}

		return this.getGuideProfile(accountId);
	}

	/**
	 * Partial update of the only fields a guide may change after registering:
	 * phone, city, type and languages. Rejects guides who have not registered
	 * yet — they must go through `upsertGuideProfile` first.
	 *
	 * `phone` is written to the Account; the rest to the Guide. Nothing here
	 * touches credentials, role, tokenVersion, or membership state.
	 */
	async patchGuideProfile(accountId: string, data: GuideProfilePatchData) {
		const account = await AccountDB.findOne({ _id: accountId, role: 'guide' });
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id });
		if (!guide || !guide.registrationCompleted) {
			throw new BadRequestError(
				'Please complete your guide registration before editing your profile'
			);
		}

		const guideUpdate: Record<string, unknown> = {};
		if (data.city !== undefined) guideUpdate.city = data.city;
		if (data.type !== undefined) guideUpdate.type = data.type;
		if (data.languages !== undefined) guideUpdate.languages = data.languages;

		if (Object.keys(guideUpdate).length > 0) {
			await GuideDB.updateOne({ _id: guide._id }, { $set: guideUpdate });
		}

		if (data.phone !== undefined) {
			await AccountDB.updateOne({ _id: account._id }, { $set: { phone: data.phone } });
		}

		return this.getGuideProfile(accountId);
	}

	/**
	 * Resolve the calling guide's own Guide row, ensuring they have registered.
	 * Shared by the photo/document self-service methods below — all of which are
	 * only meaningful once a profile exists.
	 */
	private async requireRegisteredGuide(accountId: string): Promise<IGuide> {
		const account = await AccountDB.findOne({ _id: accountId, role: 'guide' }).select('_id').lean();
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}
		const guide = await GuideDB.findOne({ accountId: account._id });
		if (!guide || !guide.registrationCompleted) {
			throw new BadRequestError(
				'Please complete your guide registration before managing your profile'
			);
		}
		return guide;
	}

	/**
	 * Replace the guide's profile photo. The controller has already uploaded the
	 * file to Cloudinary and passes the resulting URL — the previous photo is
	 * simply overwritten. Preserving the old image when no new one is supplied is
	 * the caller's job (it only calls this when there is a new URL).
	 */
	async updateProfilePhoto(accountId: string, profileImageUrl: string) {
		const guide = await this.requireRegisteredGuide(accountId);
		guide.profileImage = profileImageUrl;
		await guide.save();
		return this.getGuideProfile(accountId);
	}

	/** Remove the guide's profile photo, falling back to the empty-string default. */
	async deleteProfilePhoto(accountId: string) {
		const guide = await this.requireRegisteredGuide(accountId);
		guide.profileImage = '';
		await guide.save();
		return this.getGuideProfile(accountId);
	}

	/**
	 * Upload or replace one of the guide's two managed identity documents
	 * (Aadhaar or Guide Licence). The controller uploads to Cloudinary and passes
	 * the URL plus file metadata; here we only persist it under the right key.
	 * Independent of `identityProofs`, so the legacy positional store and the
	 * admin download route that indexes it are untouched.
	 */
	async upsertIdentityDocument(
		accountId: string,
		type: GuideIdentityDocumentType,
		document: GuideIdentityDocument
	) {
		const guide = await this.requireRegisteredGuide(accountId);
		// Set only this slot via its dot-path. Do NOT spread the live
		// `guide.identityDocuments` into a fresh object: it is a Mongoose nested
		// path, and spreading it turns the *other* (untouched) slot into `undefined`,
		// which then fails to cast to Object on save ("Cast to Object failed for
		// value undefined"). A targeted set leaves the sibling slot alone.
		guide.set(`identityDocuments.${type}`, document);
		guide.markModified(`identityDocuments.${type}`);
		await guide.save();
		return this.getGuideProfile(accountId);
	}

	/** Remove one managed identity document. Silent if the slot was already empty. */
	async deleteIdentityDocument(accountId: string, type: GuideIdentityDocumentType) {
		const guide = await this.requireRegisteredGuide(accountId);
		// Work from a plain snapshot, never the live nested path. Spreading the
		// Mongoose object corrupts the surviving slot into `undefined` (see the
		// upsert above), and assigning `undefined` to the key does not reliably
		// unset it. So: snapshot -> drop the slot -> replace the whole path.
		const existing = guide.get('identityDocuments') as
			| { toObject?: () => Record<string, { url?: string } | undefined> }
			| Record<string, { url?: string } | undefined>
			| undefined;
		const plain: Record<string, { url?: string } | undefined> =
			existing && typeof (existing as { toObject?: unknown }).toObject === 'function'
				? (existing as { toObject: () => Record<string, { url?: string } | undefined> }).toObject()
				: { ...((existing as Record<string, { url?: string } | undefined>) ?? {}) };
		if (plain[type]?.url) {
			delete plain[type];
			// Drop any phantom empty slots Mongoose materialised so a bare `{}` is
			// not re-persisted for a document the guide never uploaded.
			for (const key of Object.keys(plain)) {
				if (!plain[key]?.url) delete plain[key];
			}
			guide.set('identityDocuments', plain);
			guide.markModified('identityDocuments');
			await guide.save();
		}
		return this.getGuideProfile(accountId);
	}

	/**
	 * The guide's full membership/subscription history, newest first.
	 *
	 * Assembled from three sources that each hold part of the picture:
	 *   - Transactions   — one row per payment attempt: amount, status, dates, ids.
	 *   - membershipHistory — the actual 30-day windows that were opened.
	 *   - Invoices       — the downloadable receipt + captured payment method.
	 *
	 * Successful transactions (oldest → newest) are paired positionally with the
	 * membership windows (oldest → newest), since a window is appended on each
	 * successful payment. That pairing is best-effort for legacy rows but exact
	 * for everything written under the current flow.
	 */
	async getSubscriptionHistory(accountId: string) {
		const account = await AccountDB.findOne({ _id: accountId, role: 'guide' })
			.select('_id')
			.lean();
		if (!account) {
			throw new NotFoundError('Guide profile not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id }).lean();
		if (!guide) {
			return { data: [] };
		}

		const now = new Date();

		const [transactions, invoices] = await Promise.all([
			TransactionDB.find({
				reference_id: guide._id.toString(),
				reference_type: 'guide_membership',
			})
				.sort({ createdAt: -1 })
				.lean(),
			InvoiceDB.find({ guideAccount: account._id, invoiceType: 'guide_membership' })
				.select('_id invoiceNumber transaction paymentInfo pdfUrl')
				.lean(),
		]);

		const invoiceByTxn = new Map(
			invoices.map((inv) => [inv.transaction?.toString(), inv])
		);

		// Windows and successful payments, both oldest-first, paired by position.
		const windows = [...(guide.membershipHistory ?? [])]
			.filter((h) => h.startDate)
			.sort(
				(a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime()
			);
		const successAsc = [...transactions]
			.filter((t) => t.status === 'paid' || t.status === 'success')
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		const windowByTxnId = new Map<string, { startDate?: Date; expiryDate?: Date }>();
		successAsc.forEach((t, i) => {
			if (windows[i]) windowByTxnId.set(t._id.toString(), windows[i]);
		});

		const refundedTxnId =
			realRefund(guide)?.status === 'processed'
				? guide.membershipRefund?.transaction?.toString()
				: undefined;

		const data = transactions.map((t) => {
			const paid = t.status === 'paid' || t.status === 'success';
			const window = windowByTxnId.get(t._id.toString());
			const activation = window?.startDate ? new Date(window.startDate) : null;
			const expiry = window?.expiryDate ? new Date(window.expiryDate) : null;
			const invoice = invoiceByTxn.get(t._id.toString());

			let status: 'Active' | 'Expired' | 'Pending' | 'Cancelled';
			if ((refundedTxnId && refundedTxnId === t._id.toString()) || t.status === 'refunded') {
				status = 'Cancelled';
			} else if (!paid) {
				status = 'Pending';
			} else if (expiry && expiry > now) {
				status = 'Active';
			} else if (!expiry) {
				// Paid, but the window has not opened yet (awaiting KYC approval).
				status = 'Pending';
			} else {
				status = 'Expired';
			}

			const durationDays =
				activation && expiry
					? Math.round((expiry.getTime() - activation.getTime()) / DAY_MS)
					: null;

			return {
				id: t._id.toString(),
				plan: `${GUIDE_MEMBERSHIP_DURATION_DAYS}-day membership`,
				purchaseDate: t.createdAt,
				activationDate: activation,
				expiryDate: expiry,
				durationDays,
				amount: t.amount,
				currency: t.currency,
				paymentMethod: invoice?.paymentInfo?.method ?? null,
				paymentStatus: paid ? 'paid' : t.status,
				// Human-facing reference: prefer our own code, then the gateway id.
				transactionId: t.paymentCode ?? t.razorpay_payment_id ?? t.transaction_id,
				razorpayPaymentId: t.razorpay_payment_id ?? null,
				status,
				// Present only once the invoice has been generated; drives Download.
				invoiceId: invoice?._id.toString() ?? null,
				invoiceNumber: invoice?.invoiceNumber ?? null,
			};
		});

		return { data };
	}

	/**
	 * Create a Razorpay order for the guide membership fee. Serves both the
	 * very first payment and every future renewal — the same order-creation
	 * shape either way.
	 */
	async createMembershipOrder(accountId: string) {
		const account = await AccountDB.findOne({ _id: accountId, role: 'guide' });
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id });
		if (!guide || !guide.registrationCompleted) {
			throw new BadRequestError('Please complete your guide profile before paying for membership');
		}

		return TransactionService.createTransaction(
			{
				name: account.name,
				email: account.email,
				phone_number: account.phone,
			},
			GUIDE_MEMBERSHIP_FEE,
			{
				reference_id: guide._id.toString(),
				reference_type: 'guide_membership',
				type: 'guide',
				description: `Guide Membership Fee - ${GUIDE_MEMBERSHIP_DURATION_DAYS} days`,
			}
		);
	}

	/**
	 * Synchronous (browser-side) confirmation after a successful Razorpay
	 * checkout. The Razorpay webhook (services/payment.ts) independently
	 * reconciles the same transaction — both paths converge on
	 * finalizeMembershipPaymentByGuideId, guarded so whichever arrives first
	 * is the only one that actually extends the membership window.
	 */
	async confirmMembershipPayment(
		accountId: string,
		params: {
			transaction_id: string;
			razorpay_order_id: string;
			razorpay_payment_id: string;
			razorpay_signature: string;
		}
	) {
		const { transaction_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

		const isValid = verifyRazorpaySignature(
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature
		);
		if (!isValid) {
			throw new ServerError('Payment verification failed: invalid signature');
		}

		const transaction = await TransactionService.getTransaction(transaction_id);
		if (transaction.razorpay_order_id !== razorpay_order_id) {
			throw new ServerError('Order ID mismatch');
		}
		if (transaction.reference_type !== 'guide_membership') {
			throw new ServerError('Transaction is not a guide membership payment');
		}

		const guide = await GuideDB.findOne({ accountId });
		if (!guide || guide._id.toString() !== transaction.reference_id) {
			throw new NotFoundError('Guide profile not found for this transaction');
		}

		// Only the first caller to observe a still-pending transaction performs
		// the flip + membership extension — the webhook may win this race
		// instead, in which case this call just reports the already-updated state.
		const alreadyFinalized = transaction.status === 'success' || transaction.status === 'paid';
		if (!alreadyFinalized) {
			transaction.razorpay_payment_id = razorpay_payment_id;
			transaction.status = 'paid';
			await transaction.save();
			await this.finalizeMembershipPaymentByGuideId(guide._id.toString(), 'success');
		}

		const updatedGuide = await GuideDB.findById(guide._id);
		return { message: 'Membership payment confirmed successfully.', guide: updatedGuide };
	}

	/**
	 * Open the paid-for membership window on `guide`, starting from `from`.
	 *
	 * Renewal-safe: the period is extended from whichever is later — `from`, or an
	 * expiry still in the future — so renewing early never throws away days the
	 * guide has already paid for. Each call appends exactly one row to
	 * membershipHistory, so a row is always one real, live period.
	 *
	 * Mutates but does not save; the caller decides when to persist.
	 */
	private openMembershipWindow(guide: IGuide, from: Date) {
		const base =
			guide.membershipExpiryDate && guide.membershipExpiryDate > from
				? guide.membershipExpiryDate
				: from;
		const expiry = new Date(base.getTime() + GUIDE_MEMBERSHIP_DURATION_DAYS * DAY_MS);

		if (!guide.membershipStartDate) {
			guide.membershipStartDate = from;
		}
		guide.membershipExpiryDate = expiry;
		guide.membershipHistory = [
			...(guide.membershipHistory ?? []),
			{ startDate: base, expiryDate: expiry },
		];
		guide.membershipPendingActivation = false;
		guide.isVisible = true;

		return expiry;
	}

	/**
	 * Idempotent core of membership finalization — the single place a *payment*
	 * mutates membership state. Called from both the synchronous confirm path
	 * above and the Razorpay webhook (services/payment.ts's
	 * updateRegistrationStatus).
	 *
	 * Paying no longer starts the 30-day clock on its own. A guide who has not yet
	 * cleared KYC is parked in `membershipPendingActivation`: the fee is captured
	 * and invoiced, but the window does not open until an admin approves them, at
	 * which point it runs from the approval instant rather than from a payment
	 * that may have sat in the review queue for days. approveGuide() does that.
	 *
	 * An already-approved guide (the renewal case, and every legacy guide) is
	 * unaffected: their window opens immediately, exactly as before.
	 */
	async finalizeMembershipPaymentByGuideId(guideId: string, status: 'success' | 'failed') {
		const guide = await GuideDB.findById(guideId);
		if (!guide) {
			logError('Guide membership finalize: guide not found', { guideId });
			return null;
		}

		if (status === 'failed') {
			guide.paymentStatus = 'failed';
			await guide.save();
			return guide;
		}

		const now = new Date();

		guide.paymentStatus = 'success';
		guide.membershipPaidAt = now;

		if (isGuideApproved(guide)) {
			this.openMembershipWindow(guide, now);
		} else {
			// Paid, but the clock does not start until review passes. Nothing about
			// membershipStartDate / membershipExpiryDate is touched here — an
			// unapproved guide has no window at all yet.
			guide.membershipPendingActivation = true;
			guide.isVisible = false;
		}

		await guide.save();

		// Generate the membership invoice (non-blocking) — this single hook
		// covers both the sync confirm-payment call and the webhook path, since
		// both converge here. The invoice is for the payment, which happened
		// regardless of whether the subscription window has opened yet.
		try {
			await InvoiceService.createMembershipInvoice(guide);
		} catch (invoiceError) {
			logError('Guide membership finalize: invoice generation failed', { guideId, error: invoiceError });
		}

		return guide;
	}

	/**
	 * Update guide availability (unavailable dates)
	 */
	async updateAvailability(userId: string, unavailableDates: string[]) {
		const account = await AccountDB.findOneAndUpdate(
			{ _id: userId, role: 'guide' },
			{ unavailableDates: unavailableDates.map((d) => new Date(d)) },
			{ new: true }
		);

		if (!account) {
			throw new NotFoundError('Guide profile not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id });

		return {
			_id: account._id.toString(),
			user: account._id.toString(),
			name: account.name,
			email: account.email,
			mobile: account.phone,
			languages: guide?.languages ?? [],
			serviceLocations: guide?.city ? [guide.city] : [],
			photo: guide?.profileImage || '',
			isApproved: account.status === 'verified',
			profileComplete: !!guide?.registrationCompleted,
			isCertified: guide?.type === 'escort',
			unavailableDates: account.unavailableDates || [],
		};
	}

	/**
	 * Get all approved guides (public). Visibility is now driven entirely by
	 * the Guide collection's membership fields (isVisible + unexpired
	 * membershipExpiryDate), not Account.status — a guide's public listing
	 * lapses automatically when their 30-day membership expires, with no
	 * cron job needed since this filter is evaluated on every read.
	 */
	async getAllApprovedGuides(params?: {
		location?: string;
		language?: string;
		page?: number;
		limit?: number;
		search?: string;
	}) {
		const page = params?.page || 1;
		const limit = params?.limit || 10;
		const skip = (page - 1) * limit;
		const now = new Date();

		// isVisible is already gated on approval at the point it is set (see
		// finalizeMembershipPaymentByGuideId / rejectGuide). The membership filter
		// here is the single source of truth for public listability (shared with
		// the direct-booking guard and isMembershipActive) — a guide whose 30-day
		// window has lapsed drops out automatically, and a rejected guide is
		// delisted even if some other path forgot to clear isVisible.
		const guideQuery: any = { ...activeMembershipFilter(now) };

		if (params?.location) {
			const escapedLocation = params.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			guideQuery.city = { $regex: `^${escapedLocation}$`, $options: 'i' };
		}
		if (params?.language) {
			const escapedLanguage = params.language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			guideQuery.languages = { $regex: `^${escapedLanguage}$`, $options: 'i' };
		}

		const total = await GuideDB.countDocuments(guideQuery);
		const guides = await GuideDB.find(guideQuery).skip(skip).limit(limit).lean();

		const results = await Promise.all(
			guides.map(async (guide) => {
				const account = await AccountDB.findOne({
					_id: guide.accountId,
					role: 'guide',
					isActive: true,
				}).lean();
				if (!account) return null;

				if (params?.search) {
					const escapedSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					if (!new RegExp(escapedSearch, 'i').test(account.name)) return null;
				}

				return {
					_id: account._id.toString(),
					user: account._id.toString(),
					name: account.name,
					email: account.email,
					mobile: account.phone,
					languages: guide.languages || [],
					serviceLocations: guide.city ? [guide.city] : [],
					photo: guide.profileImage || '',
					isApproved: true,
					profileComplete: guide.registrationCompleted,
					isCertified: guide.type === 'escort',
					unavailableDates: (account as any).unavailableDates || [],
					pricing: guide.pricing ?? null,
					// A listed guide can still be un-bookable directly if they never
					// published rates — the card needs to know which button to show.
					bookable: !!guide.pricing?.fullDay && guide.pricing.fullDay > 0,
				};
			})
		);

		const filtered = results.filter(Boolean);

		return {
			data: filtered,
			total,
			page,
			totalPages: Math.ceil(total / limit),
		};
	}

	/**
	 * Get guide by ID (public). Unlike the listing above, this is NOT gated on
	 * current visibility — existing bookings/history may still need to show a
	 * guide whose membership has since lapsed. `isApproved` reflects current
	 * visibility for the UI to decide what to show.
	 */
	async getGuideById(guideId: string) {
		const account = await AccountDB.findOne({ _id: guideId, role: 'guide' });
		if (!account) {
			throw new NotFoundError('Guide not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id });
		const now = new Date();
		const isVisible = !!guide?.isVisible && !!guide?.membershipExpiryDate && guide.membershipExpiryDate > now;

		return {
			_id: account._id.toString(),
			user: account._id.toString(),
			name: account.name,
			email: account.email,
			mobile: account.phone,
			languages: guide?.languages ?? [],
			serviceLocations: guide?.city ? [guide.city] : [],
			photo: guide?.profileImage || '',
			isApproved: isVisible,
			profileComplete: !!guide?.registrationCompleted,
			isCertified: guide?.type === 'escort',
			unavailableDates: account.unavailableDates || [],
			pricing: guide?.pricing ?? null,
			bookable: isGuideApproved(guide) && !!guide?.pricing?.fullDay && guide.pricing.fullDay > 0,
		};
	}

	/**
	 * Admin listing of every guide account joined with its Guide profile —
	 * unlike getAllApprovedGuides (public, visible-only), this returns all guide
	 * accounts (active and inactive) with their business code, contact details,
	 * membership state and registration status for the admin management table.
	 */
	async getAllGuidesForAdmin() {
		const accounts = await AccountDB.find({ role: 'guide' })
			.select('name email phone isActive status createdAt')
			.sort({ createdAt: -1 })
			.lean();
		const accountIds = accounts.map((a) => a._id);

		const profiles = await GuideDB.find({ accountId: { $in: accountIds } })
			.select(
				'accountId guideCode city languages type pan isVisible registrationCompleted paymentStatus membershipStartDate membershipExpiryDate membershipPendingActivation membershipPaidAt membershipRefund adminNotes pricing approvalStatus rejectionReason approvedAt profileImage identityProofs updatedAt'
			)
			.lean();
		const profileByAccountId = new Map(profiles.map((p) => [p.accountId.toString(), p]));

		const now = new Date();
		return accounts.map((account) => {
			const profile = profileByAccountId.get(account._id.toString());
			const membershipActive =
				!!profile?.isVisible &&
				!!profile?.membershipExpiryDate &&
				new Date(profile.membershipExpiryDate) > now;
			return {
				accountId: account._id.toString(),
				guideCode: profile?.guideCode ?? null,
				name: account.name,
				email: account.email,
				phone: account.phone,
				isActive: account.isActive,
				status: account.status,
				city: profile?.city ?? '',
				languages: profile?.languages ?? [],
				type: profile?.type ?? 'normal',
				pan: profile?.pan ?? '',
				isVisible: profile?.isVisible ?? false,
				registrationCompleted: profile?.registrationCompleted ?? false,
				paymentStatus: profile?.paymentStatus ?? 'pending',
				membershipActive,
				membershipStartDate: profile?.membershipStartDate ?? null,
				membershipExpiryDate: profile?.membershipExpiryDate ?? null,
				// Paid, but waiting on this admin to approve before the clock starts.
				membershipPendingActivation: !!profile?.membershipPendingActivation,
				membershipPaidAt: profile?.membershipPaidAt ?? null,
				refundStatus: profile?.membershipRefund?.status ?? null,
				profileImage: profile?.profileImage ?? '',
				// [licence, aadhaar] in upload order. Raw stored values — filenames or
				// Cloudinary URLs, NOT links. The admin table only counts them; the
				// detail endpoint is what hands back openable `documents`, because
				// describing one stats the disk and doing that for every guide on
				// every list load buys nothing.
				identityProofs: profile?.identityProofs ?? [],
				// The notes themselves are only served by the detail endpoint; the
				// table just needs to know whether there is anything to read.
				hasAdminNotes: !!profile?.adminNotes,
				createdAt: account.createdAt,
				updatedAt: profile?.updatedAt ?? account.createdAt,
				approvalStatus: displayApprovalStatus(profile),
				rejectionReason: profile?.rejectionReason ?? '',
				approvedAt: profile?.approvedAt ?? null,
				pricing: profile?.pricing ?? null,
			};
		});
	}

	/**
	 * Everything an admin needs on one guide, on one screen: the profile, the KYC
	 * documents (as links that actually resolve), the internal notes, and the
	 * money — membership transactions with their Razorpay ids, the payout
	 * destination, any auto-refund, and the manually recorded cash payments.
	 *
	 * ADMIN ONLY. Every field below that is not already on the public guide
	 * endpoints is here precisely because it must not appear on them: Razorpay
	 * payment/order ids, bank details, and internal notes are never returned by
	 * getGuideById, getAllApprovedGuides or getPricingDetails.
	 */
	async getGuideDetailForAdmin(guideAccountId: string) {
		const account = await AccountDB.findOne({ _id: guideAccountId, role: 'guide' })
			.select('name email phone countryCode isActive status unavailableDates createdAt')
			.lean();
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id }).lean();

		const now = new Date();
		const membershipActive =
			!!guide?.isVisible && !!guide?.membershipExpiryDate && new Date(guide.membershipExpiryDate) > now;

		// Every membership fee this guide has ever been charged, newest first.
		const transactions = guide
			? await TransactionDB.find({
					reference_id: guide._id.toString(),
					reference_type: 'guide_membership',
				})
					.sort({ createdAt: -1 })
					.lean()
			: [];

		const [cashPayments, notesAuthor] = await Promise.all([
			CashPaymentService.getForGuide(guideAccountId, { limit: 100 }),
			guide?.adminNotesUpdatedBy
				? AccountDB.findById(guide.adminNotesUpdatedBy).select('name').lean()
				: null,
		]);

		return {
			accountId: account._id.toString(),
			guideId: guide?._id.toString() ?? null,
			guideCode: guide?.guideCode ?? null,
			name: account.name,
			email: account.email,
			phone: account.phone,
			countryCode: account.countryCode,
			isActive: account.isActive,
			status: account.status,
			city: guide?.city ?? '',
			languages: guide?.languages ?? [],
			type: guide?.type ?? 'normal',
			pan: guide?.pan ?? '',
			profileImage: guide?.profileImage ?? '',
			unavailableDates: account.unavailableDates ?? [],
			createdAt: account.createdAt,

			// ---- Registration & review ----
			registrationCompleted: guide?.registrationCompleted ?? false,
			approvalStatus: displayApprovalStatus(guide),
			rejectionReason: guide?.rejectionReason ?? '',
			approvedAt: guide?.approvedAt ?? null,

			// ---- Membership ----
			isVisible: guide?.isVisible ?? false,
			membershipActive,
			paymentStatus: guide?.paymentStatus ?? 'pending',
			membershipStartDate: guide?.membershipStartDate ?? null,
			membershipExpiryDate: guide?.membershipExpiryDate ?? null,
			membershipPaidAt: guide?.membershipPaidAt ?? null,
			membershipPendingActivation: !!guide?.membershipPendingActivation,
			membershipHistory: guide?.membershipHistory ?? [],

			// ---- Documents (admin-only links) ----
			documents: describeGuideDocuments(account._id.toString(), guide?.identityProofs),
			// Structured documents the guide manages themselves post-registration.
			// Additive to `documents` above (the legacy positional store); admins
			// see both so nothing a guide re-uploads is hidden from review.
			identityDocuments: {
				aadhaar: publicIdentityDocument(
					guide?.identityDocuments?.aadhaar,
					`/guides/admin/${account._id.toString()}/identity-documents/aadhaar`
				),
				guideLicence: publicIdentityDocument(
					guide?.identityDocuments?.guideLicence,
					`/guides/admin/${account._id.toString()}/identity-documents/guideLicence`
				),
			},

			// ---- Internal notes (admin-only) ----
			adminNotes: guide?.adminNotes ?? '',
			adminNotesUpdatedAt: guide?.adminNotesUpdatedAt ?? null,
			adminNotesUpdatedBy: notesAuthor?.name ?? null,

			// ---- Money (admin-only) ----
			pricing: guide?.pricing ?? null,
			bankDetails: guide?.bankDetails ?? null,
			membershipRefund: realRefund(guide),
			transactions: transactions.map((t) => ({
				_id: t._id.toString(),
				paymentCode: t.paymentCode ?? null,
				transaction_id: t.transaction_id,
				razorpay_order_id: t.razorpay_order_id,
				razorpay_payment_id: t.razorpay_payment_id ?? null,
				status: t.status,
				amount: t.amount,
				currency: t.currency,
				createdAt: t.createdAt,
			})),
			cashPayments: cashPayments.data,
			cashSummary: cashPayments.summary,
		};
	}

	/**
	 * Internal notes an admin keeps against a guide. Free-text, overwritten in
	 * place — this is a notepad, not an append-only log; the activity log records
	 * that it was edited and by whom.
	 */
	async updateAdminNotes(guideAccountId: string, notes: string, adminUserId: string) {
		const account = await AccountDB.findOne({ _id: guideAccountId, role: 'guide' })
			.select('name')
			.lean();
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id });
		if (!guide) {
			throw new NotFoundError('Guide profile not found');
		}

		guide.adminNotes = notes;
		guide.adminNotesUpdatedBy = new Types.ObjectId(adminUserId);
		guide.adminNotesUpdatedAt = new Date();
		await guide.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'guide.notes_updated',
			targetType: 'Guide',
			targetId: guide._id.toString(),
			description: `Updated internal notes on ${account.name}`,
			metadata: { accountId: guideAccountId, cleared: notes.length === 0 },
		});

		return {
			adminNotes: guide.adminNotes,
			adminNotesUpdatedAt: guide.adminNotesUpdatedAt,
		};
	}

	/**
	 * Resolve one of a guide's identity proofs for the admin-only download route.
	 * Returns the raw stored value plus its label; the controller decides whether
	 * to stream it off disk or redirect to Cloudinary.
	 */
	async getGuideDocument(guideAccountId: string, index: number) {
		const account = await AccountDB.findOne({ _id: guideAccountId, role: 'guide' })
			.select('_id')
			.lean();
		if (!account) {
			throw new NotFoundError('Guide not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id })
			.select('identityProofs')
			.lean();

		const documents = describeGuideDocuments(guideAccountId, guide?.identityProofs);
		const document = documents[index];
		if (!document) {
			throw new NotFoundError('This guide has no document at that position');
		}

		return document;
	}

	/**
	 * One of the two managed identity documents, resolved for streaming.
	 *
	 * Shared by the guide's own view route and the admin's — the difference is
	 * only which account id is looked up, which the caller has already
	 * authorised. `storage` decides where the bytes come from; a slot with no
	 * `url` is an empty slot, not a document (see `publicIdentityDocument` on why
	 * Mongoose can materialise one).
	 */
	private async resolveIdentityDocument(accountId: string, type: GuideIdentityDocumentType) {
		const guide = await GuideDB.findOne({ accountId: new Types.ObjectId(accountId) })
			.select('identityDocuments')
			.lean();

		const document = guide?.identityDocuments?.[type];
		if (!document?.url) {
			throw new NotFoundError(`No ${IDENTITY_DOCUMENT_LABELS[type]} has been uploaded`);
		}

		return {
			value: document.url,
			storage: document.storage === 'remote' ? ('remote' as const) : ('local' as const),
			label: IDENTITY_DOCUMENT_LABELS[type],
		};
	}

	/** The calling guide's own Aadhaar / licence. */
	async getOwnIdentityDocument(accountId: string, type: GuideIdentityDocumentType) {
		return this.resolveIdentityDocument(accountId, type);
	}

	/** The same, for an admin reviewing a specific guide. */
	async getIdentityDocumentForAdmin(guideAccountId: string, type: GuideIdentityDocumentType) {
		const account = await AccountDB.findOne({ _id: guideAccountId, role: 'guide' })
			.select('_id')
			.lean();
		if (!account) {
			throw new NotFoundError('Guide not found');
		}

		return this.resolveIdentityDocument(account._id.toString(), type);
	}

	// ---- Admin KYC review ---------------------------------------------------

	/**
	 * Clear a guide's KYC.
	 *
	 * This is where a paid-for subscription actually *starts*. A guide who paid
	 * while pending review has been parked in `membershipPendingActivation` since
	 * the payment landed; their 30 days run from this instant, not from the day
	 * they paid, so time spent sitting in the review queue costs them nothing.
	 *
	 * Three cases, all of which end with the guide listed iff they have a live
	 * membership window:
	 *   - paid, awaiting activation  → the window opens now (the new flow)
	 *   - already has a live window  → stays live (legacy guides who paid under
	 *                                  the old start-at-payment rule)
	 *   - not paid yet               → approved but not listed; paying now opens
	 *                                  the window immediately, since they are
	 *                                  approved by the time the payment lands
	 */
	async approveGuide(guideAccountId: string, adminUserId: string) {
		const account = await AccountDB.findOne({ _id: guideAccountId, role: 'guide' });
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id });
		if (!guide) {
			throw new NotFoundError('Guide profile not found');
		}
		if (!guide.registrationCompleted) {
			throw new BadRequestError('This guide has not submitted their KYC documents yet');
		}
		if (guide.approvalStatus === 'approved') {
			throw new ConflictError('This guide is already approved');
		}

		const approvedAt = new Date();

		guide.approvalStatus = 'approved';
		guide.approvedBy = new Types.ObjectId(adminUserId);
		guide.approvedAt = approvedAt;
		guide.rejectionReason = undefined;

		if (guide.membershipPendingActivation) {
			this.openMembershipWindow(guide, approvedAt);
		} else {
			// No parked payment: either a legacy guide with a window already running,
			// or someone who has not paid at all. Both are answered by the same test.
			guide.isVisible = !!guide.membershipExpiryDate && guide.membershipExpiryDate > approvedAt;
		}

		await guide.save();

		const listedImmediately = guide.isVisible;

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'guide.approved',
			targetType: 'Guide',
			targetId: guide._id.toString(),
			description: `Approved guide ${account.name} (${guide.guideCode ?? guide._id.toString()})`,
			metadata: {
				accountId: guideAccountId,
				listedImmediately,
				membershipStartedAt: listedImmediately ? guide.membershipStartDate : null,
				membershipExpiresAt: guide.membershipExpiryDate,
			},
		});

		await NotificationService.create({
			recipient: account._id,
			type: 'guide_approved',
			title: 'Your profile has been approved',
			message: listedImmediately
				? `Your documents have been verified and your profile is now live. Your ${GUIDE_MEMBERSHIP_DURATION_DAYS}-day subscription starts today and runs until ${guide.membershipExpiryDate?.toLocaleDateString('en-IN')}. Tourists can find and book you.`
				: 'Your documents have been verified. Pay for your membership to go live and start receiving bookings.',
			relatedEntity: { kind: 'Guide', id: guide._id.toString() },
			dedupeKey: `guide_approved:${guide._id.toString()}:${approvedAt.getTime()}`,
		});

		return guide;
	}

	/**
	 * The most recent membership fee this guide actually paid, if any.
	 * `reference_id` on a membership transaction is the Guide `_id`, not the
	 * Account id — see createMembershipOrder.
	 */
	private async paidMembershipTransaction(guideId: Types.ObjectId): Promise<ITransaction | null> {
		return TransactionDB.findOne({
			reference_id: guideId.toString(),
			reference_type: 'guide_membership',
			status: { $in: ['success', 'paid'] },
		})
			.sort({ createdAt: -1 })
			.exec();
	}

	/**
	 * Refuse a guide's KYC. Delists them immediately if they were live, and — when
	 * they paid for a membership that never started — refunds it automatically.
	 *
	 * The refund is deliberately scoped to a membership that is still parked in
	 * `membershipPendingActivation`: money taken for a subscription the guide was
	 * never allowed to use. A guide who was approved, went live, and is only now
	 * being rejected has consumed part of what they paid for, so their fee is NOT
	 * clawed back automatically — that is a judgement call, and an admin can still
	 * refund by hand from the Razorpay dashboard.
	 *
	 * A failed refund does not fail the rejection: the guide must come off the
	 * site either way, and `membershipRefund.status === 'failed'` (surfaced in the
	 * admin panel) is what tells an admin to chase the money.
	 */
	async rejectGuide(guideAccountId: string, reason: string, adminUserId: string) {
		const account = await AccountDB.findOne({ _id: guideAccountId, role: 'guide' });
		if (!account) {
			throw new NotFoundError('Guide account not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id });
		if (!guide) {
			throw new NotFoundError('Guide profile not found');
		}

		guide.approvalStatus = 'rejected';
		guide.rejectionReason = reason;
		guide.approvedBy = new Types.ObjectId(adminUserId);
		guide.approvedAt = new Date();
		guide.isVisible = false;

		const refund = await this.refundPendingMembership(guide, adminUserId);
		await guide.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'guide.rejected',
			targetType: 'Guide',
			targetId: guide._id.toString(),
			description: `Rejected guide ${account.name}: ${reason}`,
			metadata: {
				accountId: guideAccountId,
				reason,
				refundStatus: refund?.status ?? 'none',
				refundAmount: refund?.amount ?? 0,
			},
		});

		const refundLine =
			refund?.status === 'processed'
				? ` A full refund of ₹${refund.amount.toLocaleString('en-IN')} has been initiated and should reach your account in 5–7 working days.`
				: refund?.status === 'failed'
					? ' We are also arranging a refund of your membership fee — our team will be in touch.'
					: '';

		await NotificationService.create({
			recipient: account._id,
			type: 'guide_rejected',
			title: 'Your profile needs attention',
			message: `Your guide profile could not be verified. ${reason}${refundLine}`,
			relatedEntity: { kind: 'Guide', id: guide._id.toString() },
			dedupeKey: `guide_rejected:${guide._id.toString()}:${Date.now()}`,
		});

		if (refund?.status === 'processed') {
			await NotificationService.create({
				recipient: account._id,
				type: 'membership_refunded',
				title: 'Membership fee refunded',
				message: `We have refunded your ₹${refund.amount.toLocaleString('en-IN')} membership fee. It usually reaches your account in 5–7 working days.`,
				relatedEntity: { kind: 'Guide', id: guide._id.toString() },
				dedupeKey: `membership_refunded:${guide._id.toString()}:${refund.refundedAt.getTime()}`,
			});
		}

		return guide;
	}

	/**
	 * Push the guide's parked membership fee back through Razorpay. Mutates
	 * `guide` in place (the caller saves) and returns what happened, or null if
	 * there was nothing to refund.
	 *
	 * Duplicate-refund guard: a `membershipRefund` that already succeeded is never
	 * re-attempted, and `membershipPendingActivation` is cleared on the way
	 * through, so a second rejection has nothing left to act on. A *failed* refund
	 * is retried on a subsequent rejection, which is the only case where trying
	 * again is right.
	 */
	private async refundPendingMembership(guide: IGuide, adminUserId: string) {
		if (guide.membershipRefund?.status === 'processed') {
			return guide.membershipRefund;
		}
		// Only a subscription that never started is refunded automatically.
		if (!guide.membershipPendingActivation || guide.paymentStatus !== 'success') {
			return null;
		}

		const transaction = await this.paidMembershipTransaction(guide._id);
		if (!transaction || !transaction.razorpay_payment_id) {
			logError('Guide rejection: no refundable membership payment found', {
				guideId: guide._id.toString(),
			});
			return null;
		}

		const refundedAt = new Date();
		const admin = new Types.ObjectId(adminUserId);

		try {
			const refund = await TransactionService.refundPayment(
				transaction.razorpay_payment_id,
				transaction.amount,
				transaction._id.toString(),
				'guide_application_rejected'
			);

			guide.membershipRefund = {
				status: 'processed',
				refundId: refund.id,
				amount: transaction.amount,
				refundedAt,
				transaction: transaction._id,
				razorpay_payment_id: transaction.razorpay_payment_id,
				initiatedBy: admin,
			};
			// The money is back with the guide, so they no longer hold a paid
			// membership. Re-applying means paying again — which is the point.
			guide.membershipPendingActivation = false;
			guide.paymentStatus = 'pending';
		} catch (err: unknown) {
			guide.membershipRefund = {
				status: 'failed',
				amount: transaction.amount,
				refundedAt,
				failureReason: err instanceof Error ? err.message : 'Razorpay refund failed',
				transaction: transaction._id,
				razorpay_payment_id: transaction.razorpay_payment_id,
				initiatedBy: admin,
			};
			// The fee has NOT come back, so the membership stays parked and
			// paymentStatus stays 'success'. A retry (or a manual refund) still has
			// something to act on.
			logError('Guide rejection: membership refund failed', {
				guideId: guide._id.toString(),
				transactionId: transaction._id.toString(),
				error: err,
			});
		}

		return guide.membershipRefund;
	}

	/** Guides awaiting review — the admin's KYC inbox. */
	async getPendingApprovals() {
		const profiles = await GuideDB.find({
			registrationCompleted: true,
			$or: [{ approvalStatus: 'pending' }, { approvalStatus: { $exists: false }, isVisible: false }],
		})
			.sort({ createdAt: 1 })
			.lean();

		const accounts = await AccountDB.find({
			_id: { $in: profiles.map((p) => p.accountId) },
			role: 'guide',
		})
			.select('name email phone createdAt')
			.lean();

		return profiles.map((profile) => {
			const account = accounts.find((a) => a._id.toString() === profile.accountId.toString());
			return {
				accountId: profile.accountId.toString(),
				guideCode: profile.guideCode ?? null,
				name: account?.name ?? '',
				email: account?.email ?? '',
				phone: account?.phone ?? '',
				city: profile.city,
				type: profile.type ?? 'normal',
				languages: profile.languages,
				pan: profile.pan ?? '',
				profileImage: profile.profileImage,
				// [licence, aadhaar] in upload order — this is what the admin reviews.
				// Kept for backward compatibility, but these are raw filenames/URLs:
				// link to `documents` below instead, which routes through the
				// authenticated download endpoint. Using identityProofs as an href is
				// what made every document 404.
				identityProofs: profile.identityProofs,
				documents: describeGuideDocuments(profile.accountId.toString(), profile.identityProofs),
				submittedAt: profile.createdAt,
				// So the reviewer knows a rejection will trigger an automatic refund.
				membershipPendingActivation: !!profile.membershipPendingActivation,
				membershipFeePaid: profile.paymentStatus === 'success',
			};
		});
	}

	// ---- Direct-booking rates ----------------------------------------------

	/**
	 * Public. What a guide charges, and whether they can be booked directly at
	 * all. Deliberately does not 404 on a guide with no rates — "not bookable"
	 * is a normal state the booking page needs to render, not an error.
	 */
	async getPricingDetails(guideAccountId: string) {
		const account = await AccountDB.findOne({ _id: guideAccountId, role: 'guide' }).lean();
		if (!account) {
			throw new NotFoundError('Guide not found');
		}

		const guide = await GuideDB.findOne({ accountId: account._id }).lean();
		const approved = isGuideApproved(guide);
		const hasRates = !!guide?.pricing?.fullDay && guide.pricing.fullDay > 0;

		return {
			guideId: account._id.toString(),
			name: account.name,
			currency: 'INR',
			pricing: guide?.pricing ?? null,
			isCertified: guide?.type === 'escort',
			bookable: approved && hasRates,
			// Why not, so the UI can say something more useful than "unavailable".
			unavailableReason: !approved
				? 'This guide is pending verification'
				: !hasRates
					? 'This guide has not published their rates yet'
					: null,
		};
	}

	/** A guide setting their own rates. */
	async updatePricing(accountId: string, pricing: { halfDay: number; fullDay: number }) {
		const guide = await GuideDB.findOne({ accountId });
		if (!guide || !guide.registrationCompleted) {
			throw new BadRequestError('Please complete your guide registration first');
		}

		guide.pricing = pricing;
		await guide.save();

		return guide.pricing;
	}

	/**
	 * A guide's payout destination. Returned only to the owning guide and to
	 * admins (who need it to actually send the money) — never on a public route.
	 */
	async updateBankDetails(
		accountId: string,
		bankDetails: {
			accountHolderName?: string;
			accountNumber?: string;
			ifsc?: string;
			upiId?: string;
		}
	) {
		const guide = await GuideDB.findOne({ accountId });
		if (!guide || !guide.registrationCompleted) {
			throw new BadRequestError('Please complete your guide registration first');
		}

		guide.bankDetails = { ...(guide.bankDetails ?? {}), ...bankDetails };
		await guide.save();

		return guide.bankDetails;
	}
}

export default new GuideService();
