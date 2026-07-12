import { AccountDB, BookingDB, PackageDB, TouristDB, TransactionDB } from '@mongo';
import IBooking from '@mongo/types/booking';
import IPackage from '@mongo/types/package';
import {
	sendBookingAllocatedGuideEmail,
	sendBookingAllocatedTouristEmail,
	sendTouristPaymentConfirmationEmail,
} from '@provider/email';
import { verifyRazorpaySignature } from '@utils/paymentVerify';
import { calculateBookingPrice } from '@utils/priceCalculator';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { NotFoundError, ServerError } from 'node-be-utilities';
import InvoiceService from './invoice';
import TransactionService from './transaction';

// Tourists pay a 20% advance to confirm a package-tour booking; the balance is
// settled with the guide/operator later.
const PACKAGE_ADVANCE_RATE = 0.2;

/**
 * Resolve display fields for a package, tolerating both the legacy flat fields
 * and the translations.en shape, so a booking always has a city + non-empty
 * places array (the Booking schema requires at least one place).
 */
function resolvePackageFields(pkg: IPackage): {
	title: string;
	city: string;
	places: string[];
} {
	const en = pkg.translations?.en;
	const title = pkg.title || en?.title || 'Tour Package';
	const city = pkg.city || en?.city || 'N/A';
	const placesSource =
		pkg.places && pkg.places.length
			? pkg.places
			: en?.places && en.places.length
				? en.places
				: [];
	const places = placesSource.length ? placesSource : [title];
	return { title, city, places };
}

interface CreateBookingData {
	tourist_info: {
		name: string;
		gender: 'male' | 'female' | 'other';
		phone: string;
		email: string;
		country: string;
	};
	travel_details: {
		places: string[];
		city: string;
		date: Date;
		no_of_person: number;
		preferences: {
			hotel: boolean;
			taxi: boolean;
		};
	};
	guide_preferences: {
		guide_language: string[];
		gender: 'male' | 'female' | 'none';
	};
	booking_configuration: {
		duration: 'half-day' | 'full-day';
		foreign_language_required: boolean;
		outstation?: {
			distance: number;
			over_night_stay: number;
			accomodation_meals: boolean;
			special_excursion: string[];
		};
		early_late_hours: boolean;
		extra_city_allowances: boolean;
		special_event_allowances: string[];
		price: number;
	};
}

interface TransformedBooking {
	_id: string;
	id: string;
	tourist_info: {
		name: string;
		gender: string;
		phone: string;
		email: string;
		country: string;
	};
	travel_details: {
		places: string[];
		city: string;
		date: Date;
		no_of_person: number;
		preferences: {
			hotel: boolean;
			taxi: boolean;
		};
	};
	guide_preferences: {
		guide_language: string[];
		gender: string;
	};
	booking_configuration: {
		duration: string;
		foreign_language_required: boolean;
		outstation?: {
			distance: number;
			over_night_stay: number;
			accomodation_meals: boolean;
			special_excursion: string[];
		};
		early_late_hours: boolean;
		extra_city_allowances: boolean;
		special_event_allowances: string[];
		price: number;
	};
	linked_to?: string;
	transaction_id: string;
	allocated_guide?: string;
	booking_type?: string;
	package?: string;
	end_date?: Date;
	advance_paid?: number;
	balance_due?: number;
	// Populated only for package bookings (for the confirmation screen).
	package_info?: { title: string };
	guide_info?: { name: string; photo?: string };
	// Human-facing business code (BK######). Absent on documents that predate
	// the code field and have not been backfilled yet.
	bookingCode?: string;
	// The linked tourist's business code (TO######). Only enriched on the admin
	// listing (getAllBookings) — guest bookings have no linked tourist.
	touristCode?: string | null;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

function transformBooking(booking: IBooking): TransformedBooking {
	return {
		_id: booking._id.toString(),
		id: booking._id.toString(),
		tourist_info: booking.tourist_info,
		travel_details: booking.travel_details,
		guide_preferences: booking.guide_preferences,
		booking_configuration: booking.booking_configuration,
		linked_to: booking.linked_to?.toString(),
		transaction_id: booking.transaction_id,
		allocated_guide: booking.allocated_guide?.toString(),
		booking_type: booking.booking_type,
		package: booking.package?.toString(),
		end_date: booking.end_date,
		advance_paid: booking.advance_paid,
		balance_due: booking.balance_due,
		bookingCode: booking.bookingCode,
		status: booking.status,
		createdAt: booking.createdAt,
		updatedAt: booking.updatedAt,
	};
}

class BookingService {
	/**
	 * Create a Razorpay order for authenticated tourist booking.
	 * Does NOT save booking to DB — data is encoded and returned to frontend.
	 * DB write only happens after payment verification.
	 */
	async createBooking(
		data: CreateBookingData,
		userId: Types.ObjectId
	): Promise<{
		data: {
			transaction_id: string;
			booking_data: string;
			user_id: string;
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
		};
	}> {
		// Recalculate price on backend — never trust frontend price
		const priceBreakdown = calculateBookingPrice(
			data.travel_details.no_of_person,
			data.travel_details.city,
			data.booking_configuration
		);
		data.booking_configuration.price = priceBreakdown.total;

		// Encode booking data — NO DB write here
		const booking_data = Buffer.from(JSON.stringify(data)).toString('base64');
		const tempReference = randomBytes(12).toString('base64').slice(0, 16);

		// Create transaction using TransactionService
		const transaction = await TransactionService.createTransaction(
			{
				name: data.tourist_info.name,
				email: data.tourist_info.email,
				phone_number: data.tourist_info.phone,
			},
			priceBreakdown.total,
			{
				reference_id: tempReference,
				reference_type: 'pending_booking',
				type: 'tourist',
				description: 'Get My Guide Customised Booking Payment',
			}
		);

		return {
			data: {
				...transaction,
				booking_data,
				user_id: userId.toString(),
			},
		};
	}

	/**
	 * Create a new guest booking (no authentication required)
	 * NOTE: This only creates the payment order, not the booking
	 * Booking is created after payment verification
	 */
	async createGuestBooking(data: CreateBookingData): Promise<{
		data: {
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
			booking_data: string; // Base64 encoded booking data
		};
	}> {
		// Recalculate price on backend — never trust frontend price
		const priceBreakdown = calculateBookingPrice(
			data.travel_details.no_of_person,
			data.travel_details.city,
			data.booking_configuration
		);
		data.booking_configuration.price = priceBreakdown.total;

		// Generate transaction_id using base64 format
		const transaction_id = randomBytes(12).toString('base64').slice(0, 16);

		// Encode booking data to pass through payment flow
		const booking_data = Buffer.from(JSON.stringify(data)).toString('base64');

		// Create transaction using TransactionService with temporary reference
		const transaction = await TransactionService.createTransaction(
			{
				name: data.tourist_info.name,
				email: data.tourist_info.email,
				phone_number: data.tourist_info.phone,
			},
			priceBreakdown.total,
			{
				reference_id: transaction_id,
				reference_type: 'pending_booking',
				type: 'tourist',
				description: 'Get My Guide Customised Booking Payment',
			}
		);

		return {
			data: {
				...transaction,
				booking_data,
			},
		};
	}

	/**
	 * Verify Razorpay signature and create booking after successful payment.
	 * Works for both guest and authenticated bookings.
	 */
	async verifyAndCreateBooking(params: {
		razorpay_order_id: string;
		razorpay_payment_id: string;
		razorpay_signature: string;
		booking_data: string;
		user_id?: string;
	}): Promise<TransformedBooking> {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_data, user_id } =
			params;

		// Step 1: Verify Razorpay signature (HMAC SHA256)
		const isValid = verifyRazorpaySignature(
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature
		);

		if (!isValid) {
			throw new ServerError('Payment verification failed: invalid signature');
		}

		// Step 2: Verify transaction exists
		const transaction = await TransactionDB.findOne({ razorpay_order_id });

		if (!transaction) {
			throw new NotFoundError('Transaction not found');
		}

		// Step 3: Decode booking data
		const data: CreateBookingData = JSON.parse(Buffer.from(booking_data, 'base64').toString());

		// Step 3.5: Re-derive the price on the server and refuse to create a booking
		// whose configuration doesn't match the amount actually paid. This blocks a
		// tampered booking_data (e.g. paying for a cheap order but submitting an
		// expensive config at verify time). transaction.amount is stored in rupees,
		// the same unit calculateBookingPrice returns.
		const priceBreakdown = calculateBookingPrice(
			data.travel_details.no_of_person,
			data.travel_details.city,
			data.booking_configuration
		);
		if (priceBreakdown.total !== transaction.amount) {
			throw new ServerError('Payment verification failed: booking amount mismatch');
		}
		data.booking_configuration.price = priceBreakdown.total;

		// Step 4: Create booking now that payment is verified
		const booking = await BookingDB.create({
			...data,
			...(user_id ? { linked_to: new Types.ObjectId(user_id) } : {}),
			transaction_id: transaction.transaction_id,
			status: 'successful',
		});

		// Step 5: Update transaction with booking reference and mark as paid
		transaction.reference_id = booking._id.toString();
		transaction.reference_type = 'booking';
		transaction.status = 'paid';
		await transaction.save();

		// Step 6: Send payment confirmation email (non-blocking)
		try {
			await sendTouristPaymentConfirmationEmail(data.tourist_info.email, {
				name: data.tourist_info.name,
				email: data.tourist_info.email,
				phone: data.tourist_info.phone,
				city: data.travel_details.city,
				places: data.travel_details.places,
				date: data.travel_details.date.toString(),
				persons: data.travel_details.no_of_person,
				duration: data.booking_configuration.duration,
				amount: data.booking_configuration.price,
				transactionId: transaction.transaction_id,
				orderId: razorpay_order_id,
			});
		} catch (emailError) {
			// Non-blocking - don't fail the booking if email fails
		}

		// Step 7: Generate the booking invoice (non-blocking)
		try {
			await InvoiceService.createBookingInvoice(transaction, booking);
		} catch (invoiceError) {
			// Non-blocking - don't fail the booking if invoice generation fails
		}

		return transformBooking(booking);
	}

	/**
	 * Create a Razorpay order for a package-tour booking (20% advance).
	 * Mirrors createBooking: no DB write here — the booking is created only
	 * after payment is verified.
	 */
	async createPackageOrder(
		data: {
			tourId: string;
			guideId: string;
			startDate: Date;
			endDate: Date;
			tourists: number;
		},
		userId: Types.ObjectId
	): Promise<{
		data: {
			transaction_id: string;
			booking_data: string;
			user_id: string;
			razorpay_options: {
				description: string;
				currency: string;
				amount: number;
				name: string;
				order_id: string;
				prefill: { name: string; contact: string; email: string };
				key: string;
			};
		};
	}> {
		const pkg = await PackageDB.findById(data.tourId);
		if (!pkg) {
			throw new NotFoundError('Tour package not found');
		}
		if (!pkg.price || pkg.price <= 0) {
			throw new ServerError('This package is not available for online booking');
		}

		const guide = await AccountDB.findById(data.guideId);
		if (!guide || guide.role !== 'guide') {
			throw new NotFoundError('Guide not found');
		}

		const account = await AccountDB.findById(userId);
		if (!account) {
			throw new NotFoundError('Account not found');
		}

		const total = pkg.price * data.tourists;
		const advance = Math.round(total * PACKAGE_ADVANCE_RATE);

		// Encode what the verify step needs. Prices are recomputed on the server
		// at verify time, so tampering with this blob changes nothing.
		const booking_data = Buffer.from(
			JSON.stringify({
				tourId: data.tourId,
				guideId: data.guideId,
				startDate: data.startDate,
				endDate: data.endDate,
				tourists: data.tourists,
			})
		).toString('base64');
		const tempReference = randomBytes(12).toString('base64').slice(0, 16);

		const transaction = await TransactionService.createTransaction(
			{
				name: account.name,
				email: account.email,
				phone_number: account.phone || 'N/A',
			},
			advance,
			{
				reference_id: tempReference,
				reference_type: 'pending_package_booking',
				type: 'tourist',
				description: 'Get My Guide Tour Package Advance Payment',
			}
		);

		return {
			data: {
				...transaction,
				booking_data,
				user_id: userId.toString(),
			},
		};
	}

	/**
	 * Verify Razorpay signature and create a package-tour booking after payment.
	 */
	async verifyAndCreatePackageBooking(params: {
		razorpay_order_id: string;
		razorpay_payment_id: string;
		razorpay_signature: string;
		booking_data: string;
		user_id: string;
	}): Promise<TransformedBooking> {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_data, user_id } =
			params;

		const isValid = verifyRazorpaySignature(
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature
		);
		if (!isValid) {
			throw new ServerError('Payment verification failed: invalid signature');
		}

		const transaction = await TransactionDB.findOne({ razorpay_order_id });
		if (!transaction) {
			throw new NotFoundError('Transaction not found');
		}

		const decoded: {
			tourId: string;
			guideId: string;
			startDate: string;
			endDate: string;
			tourists: number;
		} = JSON.parse(Buffer.from(booking_data, 'base64').toString());

		const pkg = await PackageDB.findById(decoded.tourId);
		if (!pkg) {
			throw new NotFoundError('Tour package not found');
		}
		if (!pkg.price || pkg.price <= 0) {
			throw new ServerError('Package pricing is unavailable');
		}

		// Re-derive the amounts server-side and reject if the paid advance does
		// not match — blocks a tampered order/price.
		const total = pkg.price * decoded.tourists;
		const advance = Math.round(total * PACKAGE_ADVANCE_RATE);
		if (advance !== transaction.amount) {
			throw new ServerError('Payment verification failed: booking amount mismatch');
		}

		const guide = await AccountDB.findById(decoded.guideId);
		if (!guide || guide.role !== 'guide') {
			throw new NotFoundError('Guide not found');
		}

		const account = await AccountDB.findById(user_id);
		if (!account) {
			throw new NotFoundError('Account not found');
		}

		const { title, city, places } = resolvePackageFields(pkg);

		const booking = await BookingDB.create({
			booking_type: 'package',
			package: pkg._id,
			tourist_info: {
				name: account.name,
				gender: 'other',
				phone: account.phone || 'N/A',
				email: account.email,
				country: 'N/A',
			},
			travel_details: {
				places,
				city,
				date: new Date(decoded.startDate),
				no_of_person: decoded.tourists,
				preferences: { hotel: false, taxi: false },
			},
			guide_preferences: {
				guide_language: [],
				gender: 'none',
			},
			booking_configuration: {
				duration: 'full-day',
				foreign_language_required: false,
				early_late_hours: false,
				extra_city_allowances: false,
				special_event_allowances: [],
				price: total,
			},
			end_date: new Date(decoded.endDate),
			advance_paid: advance,
			balance_due: total - advance,
			allocated_guide: guide._id,
			linked_to: new Types.ObjectId(user_id),
			transaction_id: transaction.transaction_id,
			status: 'allocated',
		});

		transaction.reference_id = booking._id.toString();
		transaction.reference_type = 'booking';
		transaction.status = 'paid';
		await transaction.save();

		try {
			await InvoiceService.createBookingInvoice(transaction, booking);
		} catch (invoiceError) {
			// Non-blocking — don't fail the booking if invoice generation fails
		}

		return {
			...transformBooking(booking),
			package_info: { title },
			guide_info: { name: guide.name },
		};
	}

	/**
	 * Get all bookings for authenticated tourist
	 */
	async getMyBookings(userId: Types.ObjectId): Promise<TransformedBooking[]> {
		const bookings = await BookingDB.find({ linked_to: userId }).sort({ createdAt: -1 }).lean();

		return bookings.map((booking: IBooking) => transformBooking(booking));
	}

	/**
	 * Get a booking by ID for the authenticated user.
	 * Tourists can read their own bookings, guides can read assigned reservations,
	 * and admins can read any booking.
	 */
	async getBookingById(
		bookingId: Types.ObjectId,
		userId: Types.ObjectId,
		userRole: string
	): Promise<TransformedBooking> {
		let booking: IBooking | null = null;

		if (userRole === 'admin') {
			booking = await BookingDB.findById(bookingId).lean();
		} else if (userRole === 'guide') {
			booking = await BookingDB.findOne({
				_id: bookingId,
				allocated_guide: userId,
			}).lean();
		} else {
			booking = await BookingDB.findOne({
				_id: bookingId,
				linked_to: userId,
			}).lean();
		}

		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		const transformed = transformBooking(booking as IBooking);

		// Package bookings carry a package + pre-allocated guide; hydrate their
		// display info so the confirmation screen renders on a fresh load.
		if (booking.booking_type === 'package') {
			const [pkg, guide] = await Promise.all([
				booking.package ? PackageDB.findById(booking.package) : null,
				booking.allocated_guide ? AccountDB.findById(booking.allocated_guide) : null,
			]);
			if (pkg) {
				transformed.package_info = { title: resolvePackageFields(pkg).title };
			}
			if (guide) {
				transformed.guide_info = { name: guide.name };
			}
		}

		return transformed;
	}

	/**
	 * Get all bookings (admin only)
	 */
	async getAllBookings(): Promise<TransformedBooking[]> {
		const bookings = await BookingDB.find().sort({ createdAt: -1 }).lean();

		// Enrich each row with the linked tourist's business code (TO######) so
		// the admin listing can show it. Guest bookings have no linked_to, so
		// they keep touristCode = null. Batched to avoid an N+1 lookup.
		const touristAccountIds = [
			...new Set(bookings.filter((b) => b.linked_to).map((b) => b.linked_to!.toString())),
		];
		const touristProfiles = touristAccountIds.length
			? await TouristDB.find({ accountId: { $in: touristAccountIds } })
					.select('accountId touristCode')
					.lean()
			: [];
		const touristCodeByAccount = new Map(
			touristProfiles.map((p) => [p.accountId.toString(), p.touristCode ?? null])
		);

		return bookings.map((booking: IBooking) => ({
			...transformBooking(booking),
			touristCode: booking.linked_to
				? touristCodeByAccount.get(booking.linked_to.toString()) ?? null
				: null,
		}));
	}

	/**
	 * Allocate guide to booking and send emails
	 */
	async allocateGuide(
		bookingId: Types.ObjectId,
		guideId: Types.ObjectId
	): Promise<TransformedBooking> {
		const booking = await BookingDB.findById(bookingId);

		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		if (booking.status !== 'successful' && booking.status !== 'confirmed') {
			throw new ServerError('Booking is not in a valid state for guide allocation');
		}

		// Verify guide exists
		const guide = await AccountDB.findById(guideId);
		if (!guide) {
			throw new NotFoundError('Guide not found');
		}

		if (guide.role !== 'guide') {
			throw new ServerError('User is not a guide');
		}

		// Allocate guide and update status
		booking.allocated_guide = guideId;
		booking.status = 'allocated';
		await booking.save();

		// Get guide info for email
		const guideInfo = {
			name: guide.name,
			email: guide.email,
			phone: guide.phone,
		};

		// Prepare booking details for emails
		const bookingDetails = {
			tourist_info: booking.tourist_info,
			travel_details: booking.travel_details,
			guide_preferences: booking.guide_preferences,
			booking_configuration: booking.booking_configuration,
			guide_info: guideInfo,
		};

		// Send emails to tourist and guide
		const touristEmailSent = await sendBookingAllocatedTouristEmail(
			booking.tourist_info.email,
			bookingDetails
		);
		if (!touristEmailSent) {
			throw new ServerError('Failed to send email to tourist');
		}

		const guideEmailSent = await sendBookingAllocatedGuideEmail(guide.email, bookingDetails);
		if (!guideEmailSent) {
			throw new ServerError('Failed to send email to guide');
		}

		return transformBooking(booking);
	}

	/**
	 * Get bookings where guide is allocated
	 */
	async getMyReservations(guideId: Types.ObjectId): Promise<TransformedBooking[]> {
		const bookings = await BookingDB.find({ allocated_guide: guideId })
			.sort({ createdAt: -1 })
			.lean();

		return bookings.map((booking: IBooking) => transformBooking(booking));
	}

	/**
	 * Get transaction status for booking
	 */
	async getTransactionStatus(bookingId: Types.ObjectId): Promise<{
		transaction_id: string;
		status: string;
		order_status: string;
		amount: number;
		currency: string;
	}> {
		const booking = await BookingDB.findById(bookingId);

		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		// Get transaction status using TransactionService
		const transactionStatus = await TransactionService.getTransactionStatus(booking.transaction_id);

		// Update booking status if payment is completed
		if (transactionStatus.order_status === 'paid' && booking.status === 'payment-pending') {
			booking.status = 'successful';
			await booking.save();

			// Send payment confirmation email to tourist (non-blocking)
			try {
				const transaction = await TransactionService.getTransaction(booking.transaction_id);
				await sendTouristPaymentConfirmationEmail(booking.tourist_info.email, {
					name: booking.tourist_info.name,
					email: booking.tourist_info.email,
					phone: booking.tourist_info.phone,
					city: booking.travel_details.city,
					places: booking.travel_details.places,
					date: booking.travel_details.date.toISOString(),
					duration: booking.booking_configuration.duration,
					persons: booking.travel_details.no_of_person,
					amount: booking.booking_configuration.price,
					transactionId: booking.transaction_id,
					orderId: transaction.razorpay_order_id || 'N/A',
				});
			} catch (emailError) {
				// Non-blocking - booking was confirmed successfully
			}
		}

		return transactionStatus;
	}

	/**
	 * Delete a booking (admin only)
	 */
	async deleteBooking(bookingId: Types.ObjectId): Promise<{ message: string }> {
		const booking = await BookingDB.findByIdAndDelete(bookingId);

		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		return { message: 'Booking deleted successfully' };
	}
}

export default new BookingService();
