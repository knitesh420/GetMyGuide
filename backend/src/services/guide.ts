import { AccountDB, ContactInquiryDB, GuideEnrollmentDB } from '@mongo';
import IGuideEnrollment from '@mongo/types/guideEnrollment';
import { sendGuidePaymentConfirmationEmail } from '@provider/email';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { NotFoundError, ServerError } from 'node-be-utilities';
import TransactionService from './transaction';

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
	 * Create a new guide enrollment and return payment options
	 */
	async enroll(data: EnrollData): Promise<{
		enrollment_id: string;
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
		try {
			// Create enrollment without status field
			const enrollment = await GuideEnrollmentDB.create(data);

			// Create transaction using TransactionService for payment
			const transaction = await TransactionService.createTransaction(
				{
					name: data.name,
					email: data.email,
					phone_number: data.phone,
				},
				500, // 500 rupees
				{
					reference_id: enrollment._id.toString(),
					reference_type: 'enrollment',
					data: {
						enrollment_id: enrollment._id.toString(),
					},
					description: 'Guide Registration Fee - Rs 500',
				}
			);
			return {
				enrollment_id: enrollment._id.toString(),
				transaction_id: transaction.transaction_id,
				razorpay_options: transaction.razorpay_options,
			};
		} catch (error) {
			throw error;
		}
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
	 * Confirm payment - verify payment status and create guide account
	 */
	async confirmPayment(
		enrollmentId: Types.ObjectId,
		transaction_id: string
	): Promise<{ message: string }> {
		// Get transaction status (this also fetches and updates the transaction)
		const transactionStatus = await TransactionService.getTransactionStatus(transaction_id);

		// Verify transaction exists
		const transaction = await TransactionService.getTransaction(transaction_id);

		// Verify transaction belongs to this enrollment
		if (
			transaction.reference_id !== enrollmentId.toString() ||
			transaction.reference_type !== 'enrollment'
		) {
			throw new NotFoundError('Transaction not found for this enrollment');
		}

		// Verify payment is completed
		if (transactionStatus.order_status !== 'paid') {
			throw new ServerError(
				'Payment not completed. Order status: ' + transactionStatus.order_status
			);
		}

		// Get enrollment
		const enrollment = await GuideEnrollmentDB.findById(enrollmentId);

		if (!enrollment) {
			throw new NotFoundError('Enrollment not found');
		}

		// Generate random password
		const password = randomBytes(12).toString('base64').slice(0, 16);

		// Check if account already exists
		const existingAccount = await AccountDB.findOne({ email: enrollment.email.toLowerCase() });
		if (existingAccount) {
			throw new ServerError('Account with this email already exists');
		}

		// Create guide account with verified status
		await AccountDB.create({
			name: enrollment.name,
			email: enrollment.email.toLowerCase(),
			phone: enrollment.phone,
			password, // Will be hashed by pre-save hook
			role: 'guide',
			status: 'verified',
			isActive: true,
		});

		// Send payment confirmation email to guide (non-blocking)
		try {
			await sendGuidePaymentConfirmationEmail(enrollment.email, {
				name: enrollment.name,
				email: enrollment.email,
				phone: enrollment.phone,
				city: enrollment.city,
				experience: enrollment.type === 'escort' ? 'Licensed Escort Guide' : 'Regular Guide',
				languages: enrollment.languages,
				amount: 500,
				transactionId: transaction.transaction_id,
				orderId: transaction.razorpay_order_id,
			});

		} catch (emailError) {
			// Non-blocking - don't fail if email fails
		}

		// Try to send credentials email (non-blocking - don't fail if email fails)
		// try {
		// 	const emailSent = await sendGuideCredentialsEmail(
		// 		enrollment.email,
		// 		enrollment.email,
		// 		password
		// 	);
		// 	if (!emailSent) {
		// 		console.warn('Failed to send credentials email to:', enrollment.email);
		// 	}
		// } catch (emailError) {
		// 	console.error('Error sending credentials email:', emailError);
		// 	// Continue anyway - account was created successfully
		// }

		return {
			message:
				'Payment confirmed successfully. Your guide account has been created. Please check your email (' +
				enrollment.email +
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
	 * Get guide profile (Account) for the current user
	 */
	async getGuideProfile(userId: string) {
		const account = await AccountDB.findOne({ _id: userId, role: 'guide' });
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
	 * Get all approved guides (public)
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

		const query: any = { role: 'guide', isActive: true, status: 'verified' };

		if (params?.search) {
			const escapedSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			query.name = { $regex: escapedSearch, $options: 'i' };
		}

		const accounts = await AccountDB.find(query).skip(skip).limit(limit).lean();
		const total = await AccountDB.countDocuments(query);

		const guides = await Promise.all(
			accounts.map(async (account) => {
				const enrollment = await GuideEnrollmentDB.findOne({
					email: account.email.toLowerCase(),
				}).lean();

				if (params?.location && enrollment?.city?.toLowerCase() !== params.location.toLowerCase()) {
					return null;
				}
				if (
					params?.language &&
					!enrollment?.languages?.some(
						(l: string) => l.toLowerCase() === params.language!.toLowerCase()
					)
				) {
					return null;
				}

				return {
					_id: account._id.toString(),
					user: account._id.toString(),
					name: account.name,
					email: account.email,
					mobile: account.phone,
					languages: enrollment?.languages || [],
					serviceLocations: enrollment ? [enrollment.city] : [],
					photo: enrollment?.photo || '',
					isApproved: true,
					profileComplete: true,
					isCertified: enrollment?.type === 'escort',
					unavailableDates: (account as any).unavailableDates || [],
				};
			})
		);

		const filtered = guides.filter(Boolean);

		return {
			data: filtered,
			total: params?.location || params?.language ? filtered.length : total,
			page,
			totalPages: Math.ceil(total / limit),
		};
	}

	/**
	 * Get guide by ID (public)
	 */
	async getGuideById(guideId: string) {
		const account = await AccountDB.findOne({ _id: guideId, role: 'guide' });
		if (!account) {
			throw new NotFoundError('Guide not found');
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
