import mongoose from 'mongoose';
import IBooking from '../types/booking';

const BookingSchema = new mongoose.Schema<IBooking>(
	{
		tourist_info: {
			name: {
				type: String,
				required: true,
				trim: true,
			},
			gender: {
				type: String,
				enum: ['male', 'female', 'other'],
				required: true,
			},
			phone: {
				type: String,
				required: true,
				trim: true,
			},
			email: {
				type: String,
				required: true,
				lowercase: true,
				trim: true,
			},
			country: {
				type: String,
				required: true,
				trim: true,
			},
		},
		travel_details: {
			places: {
				type: [String],
				required: true,
				validate: {
					validator: (v: string[]) => Array.isArray(v) && v.length > 0,
					message: 'At least one place is required',
				},
			},
			city: {
				type: String,
				required: true,
				trim: true,
			},
			date: {
				type: Date,
				required: true,
			},
			no_of_person: {
				type: Number,
				required: true,
				min: 1,
			},
			preferences: {
				hotel: {
					type: Boolean,
					required: true,
					default: false,
				},
				taxi: {
					type: Boolean,
					required: true,
					default: false,
				},
			},
		},
		guide_preferences: {
			guide_language: {
				type: [String],
				required: true,
				default: [],
			},
			gender: {
				type: String,
				enum: ['male', 'female', 'none'],
				required: true,
			},
		},
		booking_configuration: {
			duration: {
				type: String,
				enum: ['half-day', 'full-day'],
				required: true,
			},
			foreign_language_required: {
				type: Boolean,
				required: true,
				default: false,
			},
			outstation: {
				distance: {
					type: Number,
					min: 0,
					default: 0,
				},
				over_night_stay: {
					type: Number,
					min: 0,
					default: 0,
				},
				accomodation_meals: {
					type: Boolean,
					default: false,
				},
				special_excursion: {
					type: [String],
					default: [],
				},
			},
			early_late_hours: {
				type: Boolean,
				required: true,
				default: false,
			},
			extra_city_allowances: {
				type: Boolean,
				required: true,
				default: false,
			},
			special_event_allowances: {
				type: [String],
				required: true,
				default: [],
			},
			price: {
				type: Number,
				required: true,
				min: 0,
			},
		},
		linked_to: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: false,
		},
		transaction_id: {
			type: String,
			required: true,
			trim: true,
			unique: true,
		},
		allocated_guide: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
		},
		status: {
			type: String,
			enum: ['payment-pending', 'successful', 'confirmed', 'allocated', 'completed'],
			default: 'payment-pending',
		},
	},
	{
		timestamps: true,
	}
);

const BookingDB = mongoose.model<IBooking>('Booking', BookingSchema);

export default BookingDB;
