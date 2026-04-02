import { AccountDB, BookingDB, TransactionDB } from '@mongo';
import IBooking from '@mongo/types/booking';
import {
	sendBookingAllocatedGuideEmail,
	sendBookingAllocatedTouristEmail,
	sendTouristPaymentConfirmationEmail,
} from '@provider/email';
import RazorpayOrders from '@provider/razorpay/api/orders';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { NotFoundError, ServerError } from 'node-be-utilities';
import TransactionService from './transaction';

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
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

function transformBooking(booking: IBooking): TransformedBooking {
	return {
		id: booking._id.toString(),
		tourist_info: booking.tourist_info,
		travel_details: booking.travel_details,
		guide_preferences: booking.guide_preferences,
		booking_configuration: booking.booking_configuration,
		linked_to: booking.linked_to?.toString(),
		transaction_id: booking.transaction_id,
		allocated_guide: booking.allocated_guide?.toString(),
		status: booking.status,
		createdAt: booking.createdAt,
		updatedAt: booking.updatedAt,
	};
}

class BookingService {
	/**
	 * Create a new booking and transaction
	 */
	async createBooking(
		data: CreateBookingData,
		userId: Types.ObjectId
	): Promise<{
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
		};
	}> {
		// Generate transaction_id using base64 format
		const transaction_id = randomBytes(12).toString('base64').slice(0, 16);

		// Create booking
		const booking = await BookingDB.create({
			...data,
			linked_to: userId,
			transaction_id,
			status: 'payment-pending',
		});

		// Create transaction using TransactionService
		const transaction = await TransactionService.createTransaction(
			{
				name: data.tourist_info.name,
				email: data.tourist_info.email,
				phone_number: data.tourist_info.phone,
			},
			data.booking_configuration.price,
			{
				reference_id: booking._id.toString(),
				reference_type: 'booking',
				data: {
					booking_id: booking._id.toString(),
				},
				description: 'Get My Guide Customised Booking Payment',
			}
		);

		return {
			data: transaction,
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
			data.booking_configuration.price,
			{
				reference_id: transaction_id, // Use transaction_id as temporary reference
				reference_type: 'pending_booking',
				data: {
					transaction_id: transaction_id,
					booking_data: booking_data,
				},
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
	 * Verify payment and create booking after successful payment
	 */
	async verifyAndCreateGuestBooking(
		razorpay_order_id: string,
		razorpay_payment_id: string,
		booking_data: string
	): Promise<TransformedBooking> {
		// Get transaction status from Razorpay
		const transaction = await TransactionDB.findOne({ razorpay_order_id });

		if (!transaction) {
			throw new NotFoundError('Transaction not found');
		}

		// Check payment status
		const orderStatus = await RazorpayOrders.getOrderStatus(razorpay_order_id);

		if (orderStatus !== 'paid') {
			throw new ServerError('Payment not completed');
		}

		// Decode booking data
		const data: CreateBookingData = JSON.parse(Buffer.from(booking_data, 'base64').toString());

		// Create booking now that payment is confirmed
		const booking = await BookingDB.create({
			...data,
			transaction_id: transaction.transaction_id,
			status: 'successful',
		});

		// Update transaction with booking reference
		transaction.reference_id = booking._id.toString();
		transaction.reference_type = 'booking';
		transaction.status = 'paid';
		await transaction.save();

		// Send payment confirmation email to tourist (non-blocking)
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

		return transformBooking(booking);
	}

	/**
	 * Get all bookings for authenticated tourist
	 */
	async getMyBookings(userId: Types.ObjectId): Promise<TransformedBooking[]> {
		const bookings = await BookingDB.find({ linked_to: userId }).sort({ createdAt: -1 }).lean();

		return bookings.map((booking: IBooking) => transformBooking(booking));
	}

	/**
	 * Get all bookings (admin only)
	 */
	async getAllBookings(): Promise<TransformedBooking[]> {
		const bookings = await BookingDB.find().sort({ createdAt: -1 }).lean();

		return bookings.map((booking: IBooking) => transformBooking(booking));
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

		if (
			booking.status !== 'successful' &&
			booking.status !== 'confirmed' &&
			booking.status !== 'payment-pending'
		) {
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
