import { GUIDE_MEMBERSHIP_DURATION_DAYS, GUIDE_MEMBERSHIP_FEE } from '@config/const';
import { AccountDB, ContactInquiryDB, GuideDB } from '@mongo';
import { displayApprovalStatus, isGuideApproved } from '@utils/guideApproval';
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
import InvoiceService from './invoice';
import NotificationService from './notification';
import TransactionService from './transaction';

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
	 * Idempotent core of membership finalization — the single place that
	 * actually mutates isVisible/membershipExpiryDate. Called from both the
	 * synchronous confirm path above and the Razorpay webhook
	 * (services/payment.ts's updateRegistrationStatus).
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
		// Renewal-safe: extend from whichever is later (now, or the current
		// expiry) so renewing early never loses already-paid-for days.
		const base =
			guide.membershipExpiryDate && guide.membershipExpiryDate > now
				? guide.membershipExpiryDate
				: now;
		const newExpiry = new Date(
			base.getTime() + GUIDE_MEMBERSHIP_DURATION_DAYS * 24 * 60 * 60 * 1000
		);

		guide.paymentStatus = 'success';
		// Paying is necessary but no longer sufficient — an admin must also have
		// cleared the guide's KYC. An unapproved guide keeps the membership they
		// paid for (the clock starts now either way); approveGuide() flips them
		// visible the moment review passes, without a second payment.
		guide.isVisible = isGuideApproved(guide);
		if (!guide.membershipStartDate) {
			guide.membershipStartDate = now;
		}
		guide.membershipExpiryDate = newExpiry;
		// Append-only membership record. `base` is where this purchased period
		// begins (now for a first membership, the prior expiry for a renewal),
		// so each row represents exactly one paid period.
		guide.membershipHistory = [
			...(guide.membershipHistory ?? []),
			{ startDate: base, expiryDate: newExpiry },
		];
		await guide.save();

		// Generate the membership invoice (non-blocking) — this single hook
		// covers both the sync confirm-payment call and the webhook path, since
		// both converge here.
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
		// finalizeMembershipPaymentByGuideId / rejectGuide). The $ne here is a
		// second line of defence: a guide rejected after going live is delisted
		// even if some other path forgets to clear isVisible.
		const guideQuery: any = {
			isVisible: true,
			membershipExpiryDate: { $gt: now },
			approvalStatus: { $ne: 'rejected' },
		};

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
				'accountId guideCode city languages type pan isVisible registrationCompleted paymentStatus membershipStartDate membershipExpiryDate profileImage identityProofs updatedAt'
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
				profileImage: profile?.profileImage ?? '',
				// [licence, aadhaar] in upload order — the admin panel reviews these.
				identityProofs: profile?.identityProofs ?? [],
				createdAt: account.createdAt,
				updatedAt: profile?.updatedAt ?? account.createdAt,
				approvalStatus: displayApprovalStatus(profile),
				rejectionReason: profile?.rejectionReason ?? '',
				approvedAt: profile?.approvedAt ?? null,
				pricing: profile?.pricing ?? null,
			};
		});
	}

	// ---- Admin KYC review ---------------------------------------------------

	/**
	 * Clear a guide's KYC. If they have already paid for membership this also
	 * lists them immediately — they should not have to pay twice because review
	 * happened to land after payment.
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

		const membershipActive =
			!!guide.membershipExpiryDate && guide.membershipExpiryDate > new Date();

		guide.approvalStatus = 'approved';
		guide.approvedBy = new Types.ObjectId(adminUserId);
		guide.approvedAt = new Date();
		guide.rejectionReason = undefined;
		guide.isVisible = membershipActive;
		await guide.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'guide.approved',
			targetType: 'Guide',
			targetId: guide._id.toString(),
			description: `Approved guide ${account.name} (${guide.guideCode ?? guide._id.toString()})`,
			metadata: { accountId: guideAccountId, listedImmediately: membershipActive },
		});

		await NotificationService.create({
			recipient: account._id,
			type: 'guide_approved',
			title: 'Your profile has been approved',
			message: membershipActive
				? 'Your documents have been verified and your profile is now live. Tourists can find and book you.'
				: 'Your documents have been verified. Pay for your membership to go live and start receiving bookings.',
			relatedEntity: { kind: 'Guide', id: guide._id.toString() },
			dedupeKey: `guide_approved:${guide._id.toString()}:${guide.approvedAt.getTime()}`,
		});

		return guide;
	}

	/** Refuse a guide's KYC. Delists them immediately if they were live. */
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
		await guide.save();

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'guide.rejected',
			targetType: 'Guide',
			targetId: guide._id.toString(),
			description: `Rejected guide ${account.name}: ${reason}`,
			metadata: { accountId: guideAccountId, reason },
		});

		await NotificationService.create({
			recipient: account._id,
			type: 'guide_rejected',
			title: 'Your profile needs attention',
			message: `Your guide profile could not be verified. ${reason}`,
			relatedEntity: { kind: 'Guide', id: guide._id.toString() },
			dedupeKey: `guide_rejected:${guide._id.toString()}:${Date.now()}`,
		});

		return guide;
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
				identityProofs: profile.identityProofs,
				submittedAt: profile.createdAt,
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
