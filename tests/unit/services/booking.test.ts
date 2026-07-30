import { AccountDB, BookingDB } from '@mongo';
import BookingService from '@services/booking';
import { Types } from 'mongoose';
import { NotFoundError, ServerError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

// Mock TransactionService
jest.mock('@services/transaction', () => ({
	__esModule: true,
	default: {
		createTransaction: jest.fn(),
		getTransactionStatus: jest.fn(),
		getTransaction: jest.fn(),
	},
}));

// Mock email provider
jest.mock('@provider/email', () => ({
	sendBookingAllocatedTouristEmail: jest.fn().mockResolvedValue(true),
	sendBookingAllocatedGuideEmail: jest.fn().mockResolvedValue(true),
}));

import { sendBookingAllocatedGuideEmail, sendBookingAllocatedTouristEmail } from '@provider/email';
import TransactionService from '@services/transaction';

describe('BookingService', () => {
	let testUserId: Types.ObjectId;
	let testGuideId: Types.ObjectId;

	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();

		// Create test user
		const user = await AccountDB.create({
			name: 'Test User',
			email: 'user@example.com',
			phone: '+1234567890',
			password: 'password123',
			role: 'tourist',
		});
		testUserId = user._id;

		// Create test guide
		const guide = await AccountDB.create({
			name: 'Test Guide',
			email: 'guide@example.com',
			phone: '+1234567891',
			password: 'password123',
			role: 'guide',
			status: 'verified',
		});
		testGuideId = guide._id;

		// Reset email mocks
		(sendBookingAllocatedTouristEmail as jest.Mock).mockResolvedValue(true);
		(sendBookingAllocatedGuideEmail as jest.Mock).mockResolvedValue(true);

		// Reset TransactionService mocks
		(TransactionService.createTransaction as jest.Mock).mockClear();
		(TransactionService.getTransactionStatus as jest.Mock).mockClear();
		(TransactionService.getTransaction as jest.Mock).mockClear();
	});

	describe('createBooking', () => {
		it('should create a booking and transaction', async () => {
			const bookingData = {
				tourist_info: {
					name: 'John Doe',
					gender: 'male' as const,
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal', 'Red Fort'],
					city: 'Agra',
					date: new Date('2024-12-25'),
					no_of_person: 2,
					preferences: {
						hotel: true,
						taxi: false,
					},
				},
				guide_preferences: {
					guide_language: ['English', 'Hindi'],
					gender: 'male' as const,
				},
				booking_configuration: {
					duration: 'full-day' as const,
					foreign_language_required: true,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
			};

			const mockTransaction = {
				transaction_id: 'test-transaction-id',
				razorpay_options: {
					description: 'Get My Guide Customised Booking Payment',
					currency: 'INR',
					amount: 500000,
					name: 'Get My Guide',
					order_id: 'order_123',
					prefill: {
						name: 'John Doe',
						contact: '+1234567890',
						email: 'john@example.com',
					},
					key: 'test-key',
				},
			};

			(TransactionService.createTransaction as jest.Mock).mockResolvedValue(mockTransaction);

			const result = await BookingService.createBooking(bookingData, testUserId);

			// The transaction fields are passed straight through, plus the two the
			// checkout page needs to settle the payment afterwards.
			expect(result.data).toMatchObject(mockTransaction);
			expect(result.data.user_id).toBe(testUserId.toString());
			expect(result.data.booking_data).toEqual(expect.any(String));

			expect(TransactionService.createTransaction).toHaveBeenCalledWith(
				{
					name: bookingData.tourist_info.name,
					email: bookingData.tourist_info.email,
					phone_number: bookingData.tourist_info.phone,
				},
				expect.any(Number),
				expect.objectContaining({
					// Nothing is booked until the money arrives, so the transaction
					// points at a temporary reference rather than a booking id.
					reference_type: 'pending_booking',
					account: testUserId,
					description: 'Get My Guide Customised Booking Payment',
					// Server-held snapshot the webhook reads back to create the
					// booking even if the browser never returns to verify.
					metadata: expect.objectContaining({ tourist_info: bookingData.tourist_info }),
				})
			);

			// createBooking deliberately writes no booking. The row is created once
			// the payment settles, by fulfillCustomisedBooking — called from either
			// the verify endpoint or the Razorpay webhook.
			expect(await BookingDB.findOne({ linked_to: testUserId })).toBeNull();
		});

		it('should price the booking on the server and ignore the amount the client sent', async () => {
			const bookingData = {
				tourist_info: {
					name: 'John Doe',
					gender: 'male' as const,
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: new Date('2026-12-25'),
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male' as const,
				},
				booking_configuration: {
					duration: 'full-day' as const,
					foreign_language_required: true,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					// A tampered price: whatever the client claims, the charge must be
					// the server's own calculation.
					price: 1,
				},
			};

			(TransactionService.createTransaction as jest.Mock).mockResolvedValue({
				transaction_id: 'txn',
				razorpay_options: {} as any,
			});

			await BookingService.createBooking(bookingData, testUserId);

			const [, chargedAmount, options] = (TransactionService.createTransaction as jest.Mock).mock
				.calls[0];
			expect(chargedAmount).toBeGreaterThan(1);
			// The snapshot the webhook trusts carries the recalculated price too.
			expect(options.metadata.booking_configuration.price).toBe(chargedAmount);
		});

		it('should create booking with optional outstation field', async () => {
			const bookingData = {
				tourist_info: {
					name: 'Jane Doe',
					gender: 'female' as const,
					phone: '+1234567891',
					email: 'jane@example.com',
					country: 'UK',
				},
				travel_details: {
					places: ['Goa Beach'],
					city: 'Goa',
					date: new Date('2024-12-30'),
					no_of_person: 1,
					preferences: {
						hotel: false,
						taxi: true,
					},
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'female' as const,
				},
				booking_configuration: {
					duration: 'half-day' as const,
					foreign_language_required: false,
					outstation: {
						distance: 100,
						over_night_stay: 2,
						accomodation_meals: true,
						special_excursion: ['Beach Tour'],
					},
					early_late_hours: true,
					extra_city_allowances: true,
					special_event_allowances: ['New Year'],
					price: 8000,
				},
			};

			const mockTransaction = {
				transaction_id: 'test-transaction-id-2',
				razorpay_options: {} as any,
			};

			(TransactionService.createTransaction as jest.Mock).mockResolvedValue(mockTransaction);

			const result = await BookingService.createBooking(bookingData, testUserId);

			// No booking row exists yet, so the outstation terms have to be checked
			// where they are actually held until payment settles: the base64 blob
			// handed to the client, and the server-held metadata snapshot.
			const encoded = JSON.parse(Buffer.from(result.data.booking_data, 'base64').toString());
			expect(encoded.booking_configuration.outstation).toEqual({
				distance: 100,
				over_night_stay: 2,
				accomodation_meals: true,
				special_excursion: ['Beach Tour'],
			});

			const [, , options] = (TransactionService.createTransaction as jest.Mock).mock.calls[0];
			expect(options.metadata.booking_configuration.outstation.distance).toBe(100);
			expect(options.metadata.booking_configuration.outstation.over_night_stay).toBe(2);
		});
	});

	describe('getMyBookings', () => {
		it('should return bookings for authenticated user', async () => {
			// Create bookings for test user
			await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Place 1'],
					city: 'Mumbai',
					date: new Date(),
					no_of_person: 2,
					preferences: { hotel: false, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'payment-pending',
			});

			await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Place 2'],
					city: 'Delhi',
					date: new Date(),
					no_of_person: 1,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['Hindi'],
					gender: 'none',
				},
				booking_configuration: {
					duration: 'half-day',
					foreign_language_required: true,
					early_late_hours: true,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 3000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-2',
				status: 'confirmed',
			});

			// Create booking for another user
			const otherUser = await AccountDB.create({
				name: 'Other User',
				email: 'other@example.com',
				phone: '+1234567892',
				password: 'password123',
				role: 'tourist',
			});

			await BookingDB.create({
				tourist_info: {
					name: 'Other User',
					gender: 'other',
					phone: '+1234567892',
					email: 'other@example.com',
					country: 'Canada',
				},
				travel_details: {
					places: ['Place 3'],
					city: 'Bangalore',
					date: new Date(),
					no_of_person: 3,
					preferences: { hotel: false, taxi: true },
				},
				guide_preferences: {
					guide_language: ['Kannada'],
					gender: 'female',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: true,
					special_event_allowances: [],
					price: 7000,
				},
				linked_to: otherUser._id,
				transaction_id: 'txn-3',
				status: 'payment-pending',
			});

			const bookings = await BookingService.getMyBookings(testUserId);

			expect(bookings).toHaveLength(2);
			expect(bookings[0].status).toBe('confirmed'); // Newest first
			expect(bookings[1].status).toBe('payment-pending');
			expect(bookings.every((b) => b.linked_to === testUserId.toString())).toBe(true);
		});
	});

	describe('getAllBookings', () => {
		it('should return all bookings', async () => {
			await BookingDB.create({
				tourist_info: {
					name: 'User 1',
					gender: 'male',
					phone: '+1111111111',
					email: 'user1@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Place 1'],
					city: 'Mumbai',
					date: new Date(),
					no_of_person: 1,
					preferences: { hotel: false, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'payment-pending',
			});

			await BookingDB.create({
				tourist_info: {
					name: 'User 2',
					gender: 'female',
					phone: '+2222222222',
					email: 'user2@example.com',
					country: 'UK',
				},
				travel_details: {
					places: ['Place 2'],
					city: 'Delhi',
					date: new Date(),
					no_of_person: 2,
					preferences: { hotel: true, taxi: true },
				},
				guide_preferences: {
					guide_language: ['Hindi'],
					gender: 'female',
				},
				booking_configuration: {
					duration: 'half-day',
					foreign_language_required: true,
					early_late_hours: true,
					extra_city_allowances: true,
					special_event_allowances: [],
					price: 3000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-2',
				status: 'confirmed',
			});

			const bookings = await BookingService.getAllBookings();

			expect(bookings).toHaveLength(2);
			expect(bookings[0].status).toBe('confirmed'); // Newest first
			expect(bookings[1].status).toBe('payment-pending');
		});
	});

	describe('allocateGuide', () => {
		it('should allocate guide and send emails', async () => {
			const booking = await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: new Date('2024-12-25'),
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'confirmed',
			});

			const result = await BookingService.allocateGuide(booking._id, testGuideId);

			expect(result.allocated_guide).toBe(testGuideId.toString());
			expect(result.status).toBe('allocated');

			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.allocated_guide?.toString()).toBe(testGuideId.toString());
			expect(updatedBooking?.status).toBe('allocated');

			expect(sendBookingAllocatedTouristEmail).toHaveBeenCalled();
			expect(sendBookingAllocatedGuideEmail).toHaveBeenCalled();
		});

		it('should refuse to allocate a guide to an unpaid booking', async () => {
			const booking = await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: new Date('2024-12-25'),
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'payment-pending',
			});

			// Allocation is gated on the money having arrived: allocateGuide accepts
			// only 'successful' or 'confirmed'. A payment-pending booking must not
			// consume a guide's availability.
			await expect(BookingService.allocateGuide(booking._id, testGuideId)).rejects.toThrow(
				ServerError
			);

			const untouched = await BookingDB.findById(booking._id);
			expect(untouched?.status).toBe('payment-pending');
			expect(untouched?.allocated_guide).toBeUndefined();
		});

		it('should throw NotFoundError if booking not found', async () => {
			const fakeId = new Types.ObjectId();

			await expect(BookingService.allocateGuide(fakeId, testGuideId)).rejects.toThrow(
				NotFoundError
			);
		});

		it('should throw NotFoundError if guide not found', async () => {
			const booking = await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: new Date('2024-12-25'),
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'confirmed',
			});

			const fakeGuideId = new Types.ObjectId();

			await expect(BookingService.allocateGuide(booking._id, fakeGuideId)).rejects.toThrow(
				NotFoundError
			);
		});

		it('should throw ServerError if user is not a guide', async () => {
			const booking = await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: new Date('2024-12-25'),
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'confirmed',
			});

			await expect(BookingService.allocateGuide(booking._id, testUserId)).rejects.toThrow(
				ServerError
			);
		});

		it('should throw ServerError if booking is not in valid state', async () => {
			const booking = await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: new Date('2024-12-25'),
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'completed',
			});

			await expect(BookingService.allocateGuide(booking._id, testGuideId)).rejects.toThrow(
				ServerError
			);
		});
	});

	describe('getMyReservations', () => {
		it('should return bookings where guide is allocated', async () => {
			await BookingDB.create({
				tourist_info: {
					name: 'Tourist 1',
					gender: 'male',
					phone: '+1111111111',
					email: 'tourist1@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Place 1'],
					city: 'Mumbai',
					date: new Date(),
					no_of_person: 1,
					preferences: { hotel: false, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				allocated_guide: testGuideId,
				status: 'allocated',
			});

			await BookingDB.create({
				tourist_info: {
					name: 'Tourist 2',
					gender: 'female',
					phone: '+2222222222',
					email: 'tourist2@example.com',
					country: 'UK',
				},
				travel_details: {
					places: ['Place 2'],
					city: 'Delhi',
					date: new Date(),
					no_of_person: 2,
					preferences: { hotel: true, taxi: true },
				},
				guide_preferences: {
					guide_language: ['Hindi'],
					gender: 'female',
				},
				booking_configuration: {
					duration: 'half-day',
					foreign_language_required: true,
					early_late_hours: true,
					extra_city_allowances: true,
					special_event_allowances: [],
					price: 3000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-2',
				allocated_guide: testGuideId,
				status: 'allocated',
			});

			// Create booking allocated to another guide
			const otherGuide = await AccountDB.create({
				name: 'Other Guide',
				email: 'otherguide@example.com',
				phone: '+1234567893',
				password: 'password123',
				role: 'guide',
				status: 'verified',
			});

			await BookingDB.create({
				tourist_info: {
					name: 'Tourist 3',
					gender: 'other',
					phone: '+3333333333',
					email: 'tourist3@example.com',
					country: 'Canada',
				},
				travel_details: {
					places: ['Place 3'],
					city: 'Bangalore',
					date: new Date(),
					no_of_person: 3,
					preferences: { hotel: false, taxi: true },
				},
				guide_preferences: {
					guide_language: ['Kannada'],
					gender: 'none',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: true,
					special_event_allowances: [],
					price: 7000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-3',
				allocated_guide: otherGuide._id,
				status: 'allocated',
			});

			const reservations = await BookingService.getMyReservations(testGuideId);

			expect(reservations).toHaveLength(2);
			expect(reservations[0].allocated_guide).toBe(testGuideId.toString());
			expect(reservations[1].allocated_guide).toBe(testGuideId.toString());
		});
	});

	describe('getTransactionStatus', () => {
		it('should return transaction status and update booking status if paid', async () => {
			const booking = await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: new Date('2024-12-25'),
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'payment-pending',
			});

			const mockTransactionStatus = {
				transaction_id: 'txn-1',
				status: 'paid',
				order_status: 'paid',
				amount: 5000,
				currency: 'INR',
			};

			(TransactionService.getTransactionStatus as jest.Mock).mockResolvedValue(
				mockTransactionStatus
			);

			const result = await BookingService.getTransactionStatus(
				booking._id,
				testUserId,
				'tourist'
			);

			expect(result).toEqual(mockTransactionStatus);
			expect(TransactionService.getTransactionStatus).toHaveBeenCalledWith('txn-1');

			// 'successful' is the paid state a booking lands in — it is what
			// allocateGuide accepts and what the allocation flow builds on.
			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.status).toBe('successful');
		});

		it('should not update booking status if payment not completed', async () => {
			const booking = await BookingDB.create({
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: new Date('2024-12-25'),
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: false,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
				linked_to: testUserId,
				transaction_id: 'txn-1',
				status: 'payment-pending',
			});

			const mockTransactionStatus = {
				transaction_id: 'txn-1',
				status: 'created',
				order_status: 'created',
				amount: 5000,
				currency: 'INR',
			};

			(TransactionService.getTransactionStatus as jest.Mock).mockResolvedValue(
				mockTransactionStatus
			);

			const result = await BookingService.getTransactionStatus(
				booking._id,
				testUserId,
				'tourist'
			);

			expect(result).toEqual(mockTransactionStatus);

			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.status).toBe('payment-pending');
		});

		it('should throw NotFoundError if booking not found', async () => {
			const fakeId = new Types.ObjectId();

			await expect(
				BookingService.getTransactionStatus(fakeId, testUserId, 'tourist')
			).rejects.toThrow(NotFoundError);
		});
	});
});
