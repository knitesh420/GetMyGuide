import { BadRequestError } from 'node-be-utilities';
import {
	AllocateGuideValidator,
	CreateBookingValidator,
} from '../../../../src/modules/booking/booking.validator';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
} from '../../../helpers/testHelpers';

describe('Booking Validator', () => {
	let mockRequest: any;
	let mockResponse: any;
	let mockNext: ReturnType<typeof createMockNext>;

	beforeEach(() => {
		mockRequest = createMockRequest();
		mockResponse = createMockResponse();
		mockNext = createMockNext();
	});

	describe('CreateBookingValidator', () => {
		it('should pass validation with valid data', async () => {
			mockRequest.body = {
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

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data).toBeDefined();
			expect(mockRequest.locals?.data.tourist_info.name).toBe('John Doe');
			expect(mockRequest.locals?.data.travel_details.places).toEqual(['Taj Mahal', 'Red Fort']);
			expect(mockRequest.locals?.data.booking_configuration.price).toBe(5000);
		});

		it('should pass validation with optional outstation field', async () => {
			mockRequest.body = {
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

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.booking_configuration.outstation).toBeDefined();
			expect(mockRequest.locals?.data.booking_configuration.outstation.distance).toBe(100);
		});

		it('should pass validation without outstation field', async () => {
			mockRequest.body = {
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
					preferences: {
						hotel: true,
						taxi: false,
					},
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

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.booking_configuration.outstation).toBeUndefined();
		});

		it('should parse places from comma-separated string', async () => {
			mockRequest.body = {
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: 'Place1, Place2, Place3',
					city: 'Mumbai',
					date: '2024-12-25',
					no_of_person: 2,
					preferences: {
						hotel: true,
						taxi: false,
					},
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

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.travel_details.places).toEqual([
				'Place1',
				'Place2',
				'Place3',
			]);
		});

		it('should parse price from string', async () => {
			mockRequest.body = {
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
					no_of_person: '2',
					preferences: {
						hotel: 'true',
						taxi: 'false',
					},
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'full-day',
					foreign_language_required: 'true',
					early_late_hours: 'false',
					extra_city_allowances: 'false',
					special_event_allowances: [],
					price: '5000',
				},
			};

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.booking_configuration.price).toBe(5000);
			expect(mockRequest.locals?.data.travel_details.no_of_person).toBe(2);
			expect(mockRequest.locals?.data.travel_details.preferences.hotel).toBe(true);
			expect(mockRequest.locals?.data.travel_details.preferences.taxi).toBe(false);
		});

		it('should fail validation if tourist_info.name is missing', async () => {
			mockRequest.body = {
				tourist_info: {
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
					preferences: {
						hotel: true,
						taxi: false,
					},
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

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if gender is invalid', async () => {
			mockRequest.body = {
				tourist_info: {
					name: 'John Doe',
					gender: 'invalid',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: '2024-12-25',
					no_of_person: 2,
					preferences: {
						hotel: true,
						taxi: false,
					},
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

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if email is invalid', async () => {
			mockRequest.body = {
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'invalid-email',
					country: 'USA',
				},
				travel_details: {
					places: ['Taj Mahal'],
					city: 'Agra',
					date: '2024-12-25',
					no_of_person: 2,
					preferences: {
						hotel: true,
						taxi: false,
					},
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

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if places array is empty', async () => {
			mockRequest.body = {
				tourist_info: {
					name: 'John Doe',
					gender: 'male',
					phone: '+1234567890',
					email: 'john@example.com',
					country: 'USA',
				},
				travel_details: {
					places: [],
					city: 'Agra',
					date: '2024-12-25',
					no_of_person: 2,
					preferences: {
						hotel: true,
						taxi: false,
					},
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

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if price is negative', async () => {
			mockRequest.body = {
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
					preferences: {
						hotel: true,
						taxi: false,
					},
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
					price: -100,
				},
			};

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if duration is invalid', async () => {
			mockRequest.body = {
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
					preferences: {
						hotel: true,
						taxi: false,
					},
				},
				guide_preferences: {
					guide_language: ['English'],
					gender: 'male',
				},
				booking_configuration: {
					duration: 'invalid-duration',
					foreign_language_required: true,
					early_late_hours: false,
					extra_city_allowances: false,
					special_event_allowances: [],
					price: 5000,
				},
			};

			await CreateBookingValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});
	});

	describe('AllocateGuideValidator', () => {
		it('should pass validation with valid guide_id', async () => {
			mockRequest.body = {
				guide_id: '507f1f77bcf86cd799439011',
			};

			await AllocateGuideValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.locals?.data.guide_id).toBe('507f1f77bcf86cd799439011');
		});

		it('should fail validation if guide_id is missing', async () => {
			mockRequest.body = {};

			await AllocateGuideValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});

		it('should fail validation if guide_id is empty string', async () => {
			mockRequest.body = {
				guide_id: '',
			};

			await AllocateGuideValidator(mockRequest as any, mockResponse as any, mockNext as any);

			expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
		});
	});
});
