import { GUIDE_MEMBERSHIP_DURATION_DAYS, GUIDE_MEMBERSHIP_FEE } from '@config/const';
import { AccountDB, ContactInquiryDB, GuideDB, GuideEnrollmentDB } from '@mongo';
import IGuideEnrollment from '@mongo/types/guideEnrollment';
import { sendGuidePaymentConfirmationEmail } from '@provider/email';
import { verifyRazorpaySignature } from '@utils/paymentVerify';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { BadRequestError, NotFoundError, ServerError, error as logError } from 'node-be-utilities';
import InvoiceService from './invoice';
import TransactionService from './transaction';

interface GuideProfileData {
	languages: string[];
	experience: string;
	city: string;
	state: string;
	country: string;
	price: number;
	about: string;
	specialization: string[];
	availableDays: string[];
	availableTime: string;
}

interface GuideProfileFiles {
	profileImage?: string;
	identityProofs?: string[];
	galleryImages?: string[];
}

interface EnrollData {
	name: string;
	email: string;
	phone: string;
	city: string;
	type: 'normal' | 'escort';
	pan?: string;
	licence: string;
	aadhar: string;
	languages: string[];
	photo: string;
}

interface TransformedEnrollment {
	id: string;
	name: string;
	email: string;
	phone: string;
	city: string;
	type: 'normal' | 'escort';
	pan?: string; // Optional - only for escort guides
	licence: string;
	aadhar: string;
	languages: string[];
	photo: string;
	createdAt: Date;
	updatedAt: Date;
	transaction?: {
		transaction_id: string;
		razorpay_order_id: string;
		amount: number;
		currency: string;
		status: string;
	};
}

function transformEnrollment(
	enrollment: IGuideEnrollment,
	transaction?: {
		transaction_id: string;
		razorpay_order_id: string;
		amount: number;
		currency: string;
		status: string;
	}
): TransformedEnrollment {
	return {
		id: enrollment._id.toString(),
		name: enrollment.name,
		email: enrollment.email,
		phone: enrollment.phone,
		city: enrollment.city,
		type: enrollment.type,
		pan: enrollment.pan,
		licence: enrollment.licence,
		aadhar: enrollment.aadhar,
		languages: enrollment.languages,
		photo: enrollment.photo,
		createdAt: enrollment.createdAt,
		updatedAt: enrollment.updatedAt,
		transaction,
	};
}

class GuideService {
	/**
	 * Create a Razorpay order for guide enrollment.
	 * Does NOT save enrollment to DB — data is encoded and returned to frontend.
	 * DB write only happens after payment verification in confirmPayment().
	 */
	async enroll(data: EnrollData): Promise<{
		enrollment_data: string;
		transaction_id: string;
		razorpay_options: {
			description: string;
			currency: string;
			amount: number;
			name: string;
			order_id: string;
			prefill: {
				name: string;
				contact: string;
				email: string;
			};
			key: string;
		};
	}> {
		// Encode form data (including file names) — NO DB write here
		const enrollment_data = Buffer.from(JSON.stringify(data)).toString('base64');

		// Create a temporary reference for the order
		const tempReference = randomBytes(12).toString('base64').slice(0, 16);

		// Fixed registration fee — defined on backend only
		const GUIDE_REGISTRATION_FEE = 500;

		// Create transaction using TransactionService for payment
		const transaction = await TransactionService.createTransaction(
			{
				name: data.name,
				email: data.email,
				phone_number: data.phone,
			},
			GUIDE_REGISTRATION_FEE,
			{
				reference_id: tempReference,
				reference_type: 'pending_enrollment',
				type: 'guide',
				description: 'Guide Registration Fee - Rs 500',
			}
		);
		return {
			enrollment_data,
			transaction_id: transaction.transaction_id,
			razorpay_options: transaction.razorpay_options,
		};
	}

	/**
	 * Get all enrollments (admin only)
	 */
	async getAllEnrollments(query?: string): Promise<TransformedEnrollment[]> {
		const _query = query
			? {
					$or: [
						{
							city: { $regex: `^${query}`, $options: 'i' },
						},
						{
							languages: { $regex: `^${query}`, $options: 'i' },
						},
					],
				}
			: undefined;
		const enrollments = await GuideEnrollmentDB.find(_query || {})
			.sort({ createdAt: -1 })
			.lean();

		// Fetch transaction details for each enrollment
		const enrollmentsWithTransactions = await Promise.all(
			enrollments.map(async (enrollment: IGuideEnrollment) => {
				try {
					// Try to get transaction for this enrollment
					const transaction = await TransactionService.getTransactionByReference(
						enrollment._id.toString(),
						'enrollment'
					);

					if (transaction) {
						return transformEnrollment(enrollment, {
							transaction_id: transaction.transaction_id,
							razorpay_order_id: transaction.razorpay_order_id,
							amount: transaction.amount,
							currency: transaction.currency,
							status: transaction.status,
						});
					}
				} catch (error) {
					// If transaction not found, just return enrollment without transaction details
				}

				return transformEnrollment(enrollment);
			})
		);

		return enrollmentsWithTransactions;
	}

	/**
	 * Get enrollment by ID
	 */
	async getEnrollmentById(enrollmentId: Types.ObjectId): Promise<TransformedEnrollment> {
		const enrollment = await GuideEnrollmentDB.findById(enrollmentId).lean();

		if (!enrollment) {
			throw new NotFoundError('Enrollment not found');
		}

		return transformEnrollment(enrollment as IGuideEnrollment);
	}

	/**
	 * Confirm payment — verify Razorpay signature, then save enrollment + create account.
	 * This is the ONLY place where guide data is written to DB.
	 */
	async confirmPayment(params: {
		transaction_id: string;
		razorpay_order_id: string;
		razorpay_payment_id: string;
		razorpay_signature: string;
		enrollment_data: string;
	}): Promise<{ message: string }> {
		const {
			transaction_id,
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			enrollment_data,
		} = params;

		// Step 1: Verify Razorpay signature (HMAC SHA256)
		const isValid = verifyRazorpaySignature(
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature
		);

		if (!isValid) {
			throw new ServerError('Payment verification failed: invalid signature');
		}

		// Step 2: Verify transaction exists and matches
		const transaction = await TransactionService.getTransaction(transaction_id);

		if (transaction.razorpay_order_id !== razorpay_order_id) {
			throw new ServerError('Order ID mismatch');
		}

		// Step 3: Decode enrollment data
		const data: EnrollData = JSON.parse(
			Buffer.from(enrollment_data, 'base64').toString()
		);

		// Step 4: Check for duplicate — prevent double save
		const existingGuideAccount = await AccountDB.findOne({
			email: data.email.toLowerCase(),
			role: 'guide',
		});
		if (existingGuideAccount) {
			throw new ServerError('A guide account with this email already exists');
		}

		// Step 5: NOW save enrollment to DB (only after verification)
		const enrollment = await GuideEnrollmentDB.create({ ...data, status: 'completed' });

		// Step 6: Update transaction with enrollment reference and mark as paid
		transaction.reference_id = enrollment._id.toString();
		transaction.reference_type = 'enrollment';
		transaction.status = 'paid';
		await transaction.save();

		// Step 7: Generate random password and create guide account
		const password = randomBytes(12).toString('base64').slice(0, 16);

		await AccountDB.create({
			name: data.name,
			email: data.email.toLowerCase(),
			phone: data.phone,
			password, // Will be hashed by pre-save hook
			role: 'guide',
			status: 'verified',
			// Razorpay payment + submitted KYC docs already prove control of this
			// email/identity — trusted path, same as admin creation.
			emailVerified: true,
			isActive: true,
		});

		// Step 8: Send payment confirmation email (non-blocking)
		try {
			await sendGuidePaymentConfirmationEmail(data.email, {
				name: data.name,
				email: data.email,
				phone: data.phone,
				city: data.city,
				experience: data.type === 'escort' ? 'Licensed Escort Guide' : 'Regular Guide',
				languages: data.languages,
				amount: 500,
				transactionId: transaction.transaction_id,
				orderId: razorpay_order_id,
			});
		} catch (emailError) {
			// Non-blocking - don't fail if email fails
		}

		return {
			message:
				'Payment confirmed successfully. Your guide account has been created. Please check your email (' +
				data.email +
				') for your login credentials.',
		};
	}

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
	 * Delete (remove) a guide enrollment by ID (admin only)
	 */
	async deleteEnrollment(enrollmentId: Types.ObjectId): Promise<{ message: string }> {
		const enrollment = await GuideEnrollmentDB.findByIdAndDelete(enrollmentId);

		if (!enrollment) {
			throw new NotFoundError('Enrollment not found');
		}

		return {
			message: 'Guide enrollment deleted successfully',
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
		// Legacy record from the old anonymous KYC-and-pay flow — used as a
		// fallback source for guides who haven't filled the new profile form yet.
		const enrollment = await GuideEnrollmentDB.findOne({ email: account.email.toLowerCase() });

		const now = new Date();
		const membershipExpired = !guide?.membershipExpiryDate || guide.membershipExpiryDate <= now;

		return {
			_id: account._id.toString(),
			user: account._id.toString(),
			name: account.name,
			email: account.email,
			mobile: account.phone,
			countryCode: account.countryCode,
			languages: guide?.languages?.length ? guide.languages : enrollment?.languages || [],
			experience: guide?.experience || '',
			city: guide?.city || enrollment?.city || '',
			state: guide?.state || '',
			country: guide?.country || '',
			price: guide?.price || 0,
			about: guide?.about || '',
			specialization: guide?.specialization || [],
			availableDays: guide?.availableDays || [],
			availableTime: guide?.availableTime || '',
			profileImage: guide?.profileImage || enrollment?.photo || '',
			identityProofs: guide?.identityProofs || [],
			galleryImages: guide?.galleryImages || [],
			// Legacy field names some existing frontend code still reads
			serviceLocations: guide?.city ? [guide.city] : enrollment ? [enrollment.city] : [],
			photo: guide?.profileImage || enrollment?.photo || '',
			isApproved: account.status === 'verified',
			isCertified: enrollment?.type === 'escort',
			unavailableDates: account.unavailableDates || [],
			// Membership
			registrationCompleted: guide?.registrationCompleted || false,
			paymentStatus: guide?.paymentStatus || 'pending',
			isVisible: guide?.isVisible || false,
			membershipStartDate: guide?.membershipStartDate || null,
			membershipExpiryDate: guide?.membershipExpiryDate || null,
			membershipExpired,
			profileComplete: !!guide?.registrationCompleted,
		};
	}

	/**
	 * Create or update the post-login guide profile (languages, experience,
	 * location, pricing, KYC/gallery files, etc). Does not touch
	 * payment/visibility/membership fields — those only change via the
	 * membership payment flow below.
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

		const update: Record<string, unknown> = { ...data, registrationCompleted: true };
		if (files.profileImage) update.profileImage = files.profileImage;
		if (files.identityProofs?.length) update.identityProofs = files.identityProofs;
		if (files.galleryImages?.length) update.galleryImages = files.galleryImages;

		if (existing) {
			await GuideDB.findOneAndUpdate({ accountId: account._id }, { $set: update });
		} else {
			await GuideDB.create({ accountId: account._id, ...update });
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
		guide.isVisible = true;
		if (!guide.membershipStartDate) {
			guide.membershipStartDate = now;
		}
		guide.membershipExpiryDate = newExpiry;
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

		const enrollment = await GuideEnrollmentDB.findOne({ email: account.email.toLowerCase() });

		return {
			_id: account._id.toString(),
			user: account._id.toString(),
			name: account.name,
			email: account.email,
			mobile: account.phone,
			languages: enrollment?.languages || [],
			serviceLocations: enrollment ? [enrollment.city] : [],
			photo: enrollment?.photo || '',
			isApproved: account.status === 'verified',
			profileComplete: true,
			isCertified: enrollment?.type === 'escort',
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

		const guideQuery: any = { isVisible: true, membershipExpiryDate: { $gt: now } };

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
					isCertified: false,
					unavailableDates: (account as any).unavailableDates || [],
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
		const enrollment = await GuideEnrollmentDB.findOne({ email: account.email.toLowerCase() });
		const now = new Date();
		const isVisible = !!guide?.isVisible && !!guide?.membershipExpiryDate && guide.membershipExpiryDate > now;

		return {
			_id: account._id.toString(),
			user: account._id.toString(),
			name: account.name,
			email: account.email,
			mobile: account.phone,
			languages: guide?.languages?.length ? guide.languages : enrollment?.languages || [],
			serviceLocations: guide?.city ? [guide.city] : enrollment ? [enrollment.city] : [],
			photo: guide?.profileImage || enrollment?.photo || '',
			isApproved: isVisible,
			profileComplete: !!guide?.registrationCompleted,
			isCertified: enrollment?.type === 'escort',
			unavailableDates: account.unavailableDates || [],
		};
	}

	/**
	 * Get current user's guide enrollment by email
	 */
	async getMyGuideEnrollment(email: string): Promise<TransformedEnrollment | null> {
		const enrollment = await GuideEnrollmentDB.findOne({
			email: email.toLowerCase(),
		});

		if (!enrollment) {
			return null;
		}

		return transformEnrollment(enrollment);
	}
}

export default new GuideService();
