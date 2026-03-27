import AuthService from '@services/auth';
import { AccountDB, BookingDB } from '@mongo';
import express from 'express';
import request from 'supertest';
import configServer from '../../src/server-config';
import { testSignupData, testUser } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

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

describe('Booking API Integration Tests', () => {
	let app: express.Application;
	let adminToken: string;
	let touristToken: string;
	let guideToken: string;
	let touristId: string;
	let guideId: string;

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();

		// Create admin user
		const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
		const adminResult = await AuthService.signup(adminData);
		adminToken = adminResult.token;

		// Create tourist user
		const touristResult = await AuthService.signup(testUser);
		touristToken = touristResult.token;
		const tourist = await AccountDB.findOne({ email: testUser.email });
		touristId = tourist!._id.toString();

		// Create guide user
		const guideData = { ...testSignupData, email: 'guide@example.com', role: 'guide' as const };
		const guideResult = await AuthService.signup(guideData);
		guideToken = guideResult.token;
		const guide = await AccountDB.findOne({ email: 'guide@example.com' });
		guideId = guide!._id.toString();

		// Mock transaction service
		(TransactionService.createTransaction as jest.Mock).mockResolvedValue({
			transaction_id: 'test-txn-id',
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
		});

		(TransactionService.getTransactionStatus as jest.Mock).mockResolvedValue({
			transaction_id: 'test-txn-id',
			status: 'paid',
			order_status: 'paid',
			amount: 5000,
			currency: 'INR',
		});

		// Reset email mocks
		(sendBookingAllocatedTouristEmail as jest.Mock).mockResolvedValue(true);
		(sendBookingAllocatedGuideEmail as jest.Mock).mockResolvedValue(true);
	});

	describe('POST /booking/customised-booking', () => {
		it('should create a booking and return transaction data (tourist)', async () => {
			const bookingData = {
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal', 'Red Fort'],
					city: 'Agra',
					date: '2024-12-25',
					no_of_person: 2,
					preferences: {
						hotel: true,
						taxi: false,
					},
				},
				guide_preferences: {
					guide_language: ['English', 'Hindi'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: true,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
			};

			const response = await request(app)
				.post('/booking/customised-booking')
				.set('Authorization', `Bearer ${touristToken}`)
				.send(bookingData);

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body).toBeDefined();
			expect(response.body.transaction_id).toBe('test-txn-id');
			expect(TransactionService.createTransaction).toHaveBeenCalled();

			const booking = await BookingDB.findOne({ linked_to: touristId });
			expect(booking).toBeTruthy();
			expect(booking?.status).toBe('payment-pending');
			expect(booking?.tourist_info.name).toBe('John Doe');
		});

		it('should create booking with optional outstation field', async () => {
			const bookingData = {
				tourist_info: {
					name: 'Jane Doe',
					gender: 'female',
					phone: '+1234567891',
					email: 'jane@example.com',
					country: 'UK',
				},
				travel_details: {
					places: ['Goa Beach'],
					city: 'Goa',
					date: '2024-12-30',
					no_of_person: 1,
					preferences: {
						hotel: false,
						taxi: true,
					},
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'female',
				},
				booking_configuration: {
					duration: 'half-day',
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

			const response = await request(app)
				.post('/booking/customised-booking')
				.set('Authorization', `Bearer ${touristToken}`)
				.send(bookingData);

			expect(response.status).toBe(201);
			const booking = await BookingDB.findOne({ linked_to: touristId });
			expect(booking?.booking_configuration.outstation).toBeDefined();
			expect(booking?.booking_configuration.outstation?.distance).toBe(100);
		});

		it('should fail without authentication', async () => {
			const bookingData = {
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
					date: '2024-12-25',
					no_of_person: 2,
					preferences: { hotel: true, taxi: false },
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: true,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
			};

			const response = await request(app).post('/booking/customised-booking').send(bookingData);

			expect(response.status).toBe(401);
		});

		it('should fail with invalid data', async () => {
			const invalidData = {
				tourist_info: {
					name: 'John Doe',
					// Missing required fields
				},
			};

			const response = await request(app)
				.post('/booking/customised-booking')
				.set('Authorization', `Bearer ${touristToken}`)
				.send(invalidData);

			expect(response.status).toBe(400);
		});
	});

	describe('GET /booking/my-bookings', () => {
		it('should return bookings for authenticated tourist', async () => {
			// Create test bookings
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
				linked_to: touristId,
				transaction_id: 'txn-1',
				status: 'payment-pending',
			});

			const response = await request(app)
				.get('/booking/my-bookings')
				.set('Authorization', `Bearer ${touristToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.bookings).toHaveLength(1);
			expect(response.body.bookings[0].status).toBe('payment-pending');
		});

		it('should fail without authentication', async () => {
			const response = await request(app).get('/booking/my-bookings');

			expect(response.status).toBe(401);
		});
	});

	describe('GET /booking/', () => {
		it('should return all bookings (admin)', async () => {
			// Create test bookings
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
				linked_to: touristId,
				transaction_id: 'txn-1',
				status: 'payment-pending',
			});

			const response = await request(app)
				.get('/booking/')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.bookings).toHaveLength(1);
		});

		it('should fail for non-admin users', async () => {
			const response = await request(app)
				.get('/booking/')
				.set('Authorization', `Bearer ${touristToken}`);

			expect(response.status).toBe(401);
		});
	});

	describe('POST /booking/:id/allocate-guide', () => {
		it('should allocate guide to booking (admin)', async () => {
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
				linked_to: touristId,
				transaction_id: 'txn-1',
				status: 'confirmed',
			});

			const response = await request(app)
				.post(`/booking/${booking._id}/allocate-guide`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ guide_id: guideId });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.allocated_guide).toBe(guideId);
			expect(response.body.status).toBe('allocated');
			expect(sendBookingAllocatedTouristEmail).toHaveBeenCalled();
			expect(sendBookingAllocatedGuideEmail).toHaveBeenCalled();

			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.allocated_guide?.toString()).toBe(guideId);
		});

		it('should fail for non-admin users', async () => {
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
				linked_to: touristId,
				transaction_id: 'txn-1',
				status: 'confirmed',
			});

			const response = await request(app)
				.post(`/booking/${booking._id}/allocate-guide`)
				.set('Authorization', `Bearer ${touristToken}`)
				.send({ guide_id: guideId });

			expect(response.status).toBe(401);
		});
	});

	describe('GET /booking/my-reservations', () => {
		it('should return reservations for authenticated guide', async () => {
			// Create booking allocated to guide
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
				linked_to: touristId,
				transaction_id: 'txn-1',
				allocated_guide: guideId,
				status: 'allocated',
			});

			const response = await request(app)
				.get('/booking/my-reservations')
				.set('Authorization', `Bearer ${guideToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.bookings).toHaveLength(1);
			expect(response.body.bookings[0].allocated_guide).toBe(guideId);
		});

		it('should fail without authentication', async () => {
			const response = await request(app).get('/booking/my-reservations');

			expect(response.status).toBe(401);
		});
	});

	describe('GET /booking/:id/transaction-status', () => {
		it('should return transaction status', async () => {
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
				linked_to: touristId,
				transaction_id: 'test-txn-id',
				status: 'payment-pending',
			});

			const response = await request(app)
				.get(`/booking/${booking._id}/transaction-status`)
				.set('Authorization', `Bearer ${touristToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.transaction_id).toBe('test-txn-id');
			expect(response.body.order_status).toBe('paid');
			expect(TransactionService.getTransactionStatus).toHaveBeenCalledWith('test-txn-id');

			// Check that booking status was updated
			const updatedBooking = await BookingDB.findById(booking._id);
			expect(updatedBooking?.status).toBe('confirmed');
		});

		it('should fail without authentication', async () => {
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
				linked_to: touristId,
				transaction_id: 'txn-1',
				status: 'payment-pending',
			});

			const response = await request(app).get(`/booking/${booking._id}/transaction-status`);

			expect(response.status).toBe(401);
		});
	});
});
