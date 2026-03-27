import BookingService from '@services/booking';
import { Types } from 'mongoose';
import { NotFoundError } from 'node-be-utilities';
import BookingController from '../../../../src/modules/booking/booking.controller';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
	createMockUser,
} from '../../../helpers/testHelpers';

// Mock BookingService
jest.mock('@services/booking', () => ({
	__esModule: true,
	default: {
		createBooking: jest.fn(),
		getMyBookings: jest.fn(),
		getAllBookings: jest.fn(),
		allocateGuide: jest.fn(),
		getMyReservations: jest.fn(),
		getTransactionStatus: jest.fn(),
	},
}));

describe('Booking Controller', () => {
	let mockRequest: any;
	let mockResponse: any;
	let mockNext: ReturnType<typeof createMockNext>;

	beforeEach(() => {
		mockRequest = createMockRequest();
		mockResponse = createMockResponse();
		mockNext = createMockNext();
		jest.clearAllMocks();
	});

	describe('createCustomisedBooking', () => {
		it('should create booking and return transaction data', async () => {
			const mockUser = createMockUser({ userId: '507f1f77bcf86cd799439011', role: 'tourist' });
			mockRequest.locals = {
				user: mockUser,
				data: {
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
						foreign_language_required: true,
						early_late_hours: false,
						extra_city_allowances: false,
						special_event_allowances: [],
						price: 5000,
					},
				},
			};

			const mockTransactionData = {
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
			};

			(BookingService.createBooking as jest.Mock).mockResolvedValue({
				data: mockTransactionData,
			});

			await BookingController.createCustomisedBooking(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(BookingService.createBooking).toHaveBeenCalledWith(
				mockRequest.locals.data,
				expect.any(Types.ObjectId)
			);
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				...mockTransactionData,
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should handle errors', async () => {
			const mockUser = createMockUser({ userId: '507f1f77bcf86cd799439011', role: 'tourist' });
			mockRequest.locals = {
				user: mockUser,
				data: {},
			};

			const error = new Error('Test error');
			(BookingService.createBooking as jest.Mock).mockRejectedValue(error);

			await BookingController.createCustomisedBooking(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('getMyBookings', () => {
		it('should return bookings for authenticated user', async () => {
			const mockUser = createMockUser({ userId: '507f1f77bcf86cd799439011', role: 'tourist' });
			mockRequest.locals = { user: mockUser };

			const mockBookings = [
				{
					id: 'booking-1',
					tourist_info: { name: 'John Doe' },
					status: 'confirmed',
				},
				{
					id: 'booking-2',
					tourist_info: { name: 'John Doe' },
					status: 'payment-pending',
				},
			];

			(BookingService.getMyBookings as jest.Mock).mockResolvedValue(mockBookings);

			await BookingController.getMyBookings(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(BookingService.getMyBookings).toHaveBeenCalledWith(expect.any(Types.ObjectId));
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				bookings: mockBookings,
			});
		});
	});

	describe('getAllBookings', () => {
		it('should return all bookings', async () => {
			mockRequest.locals = {};

			const mockBookings = [
				{
					id: 'booking-1',
					tourist_info: { name: 'User 1' },
					status: 'confirmed',
				},
				{
					id: 'booking-2',
					tourist_info: { name: 'User 2' },
					status: 'payment-pending',
				},
			];

			(BookingService.getAllBookings as jest.Mock).mockResolvedValue(mockBookings);

			await BookingController.getAllBookings(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(BookingService.getAllBookings).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				bookings: mockBookings,
			});
		});
	});

	describe('allocateGuide', () => {
		it('should allocate guide to booking', async () => {
			const bookingId = new Types.ObjectId();
			mockRequest.locals = {
				id: bookingId,
				data: {
					guide_id: '507f1f77bcf86cd799439012',
				},
			};

			const mockBooking = {
				id: bookingId.toString(),
				allocated_guide: '507f1f77bcf86cd799439012',
				status: 'allocated',
			};

			(BookingService.allocateGuide as jest.Mock).mockResolvedValue(mockBooking);

			await BookingController.allocateGuide(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(BookingService.allocateGuide).toHaveBeenCalledWith(
				bookingId,
				expect.any(Types.ObjectId)
			);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				...mockBooking,
			});
		});

		it('should handle NotFoundError', async () => {
			const bookingId = new Types.ObjectId();
			mockRequest.locals = {
				id: bookingId,
				data: {
					guide_id: '507f1f77bcf86cd799439012',
				},
			};

			const error = new NotFoundError('Booking not found');
			(BookingService.allocateGuide as jest.Mock).mockRejectedValue(error);

			await BookingController.allocateGuide(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('getMyReservations', () => {
		it('should return reservations for authenticated guide', async () => {
			const mockUser = createMockUser({ userId: '507f1f77bcf86cd799439012', role: 'guide' });
			mockRequest.locals = { user: mockUser };

			const mockReservations = [
				{
					id: 'booking-1',
					allocated_guide: '507f1f77bcf86cd799439012',
					status: 'allocated',
				},
				{
					id: 'booking-2',
					allocated_guide: '507f1f77bcf86cd799439012',
					status: 'allocated',
				},
			];

			(BookingService.getMyReservations as jest.Mock).mockResolvedValue(mockReservations);

			await BookingController.getMyReservations(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(BookingService.getMyReservations).toHaveBeenCalledWith(expect.any(Types.ObjectId));
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				bookings: mockReservations,
			});
		});
	});

	describe('getTransactionStatus', () => {
		it('should return transaction status', async () => {
			const bookingId = new Types.ObjectId();
			mockRequest.locals = { id: bookingId };

			const mockTransactionStatus = {
				transaction_id: 'txn-1',
				status: 'paid',
				order_status: 'paid',
				amount: 5000,
				currency: 'INR',
			};

			(BookingService.getTransactionStatus as jest.Mock).mockResolvedValue(mockTransactionStatus);

			await BookingController.getTransactionStatus(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(BookingService.getTransactionStatus).toHaveBeenCalledWith(bookingId);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				...mockTransactionStatus,
			});
		});

		it('should handle NotFoundError', async () => {
			const bookingId = new Types.ObjectId();
			mockRequest.locals = { id: bookingId };

			const error = new NotFoundError('Booking not found');
			(BookingService.getTransactionStatus as jest.Mock).mockRejectedValue(error);

			await BookingController.getTransactionStatus(
				mockRequest as any,
				mockResponse as any,
				mockNext as any
			);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});
});
