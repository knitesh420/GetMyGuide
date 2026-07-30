import mongoose from 'mongoose';
import IBooking from '../types/booking';
import { nextCode } from '../utils/businessId';

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
		booking_type: {
			type: String,
			enum: ['guide', 'package', 'guide_direct'],
			default: 'guide',
		},
		package: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Package',
		},
		end_date: {
			type: Date,
		},
		advance_paid: {
			type: Number,
			min: 0,
		},
		balance_due: {
			type: Number,
			min: 0,
		},
		balance_paid_at: {
			type: Date,
		},
		// The in-flight Razorpay order for the balance leg. Matched at verify
		// time so a signature from some other order can't settle this booking.
		balance_order_id: {
			type: String,
			trim: true,
		},
		cancellation: {
			reason: { type: String, trim: true, maxlength: 2000 },
			requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
			cancelledAt: { type: Date },
			refundRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'RefundRequest' },
		},
		status: {
			type: String,
			enum: ['payment-pending', 'successful', 'confirmed', 'allocated', 'completed', 'cancelled'],
			default: 'payment-pending',
		},
		// Human-facing business ID, e.g. "BK000001". Sparse so the pre-existing
		// documents that predate this field don't collide on the unique index.
		bookingCode: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
		},
		// Append-only lifecycle timeline. Populated by services on each status
		// change; empty on legacy documents (harmless).
		statusHistory: {
			type: [
				{
					status: { type: String },
					at: { type: Date, default: Date.now },
					by: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
					note: { type: String, trim: true, maxlength: 2000 },
					_id: false,
				},
			],
			default: [],
		},
		// Soft delete. Null/absent means live. Enforced by the query middleware
		// below so no call site can accidentally surface a deleted booking.
		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

// Query performance — every admin list, guide queue, and "my bookings" filters
// on exactly these. Previously only transaction_id (unique) was indexed.
BookingSchema.index({ status: 1, 'travel_details.date': 1 });
BookingSchema.index({ allocated_guide: 1, status: 1 });
BookingSchema.index({ linked_to: 1, createdAt: -1 });
BookingSchema.index({ 'tourist_info.email': 1, createdAt: -1 });
BookingSchema.index({ createdAt: -1 });

// Auto-assign a business code on creation (Booking is created via .create(),
// so the document validate hook fires).
BookingSchema.pre('validate', async function () {
	if (this.isNew && !this.bookingCode) {
		this.bookingCode = await nextCode('booking');
	}
});

// Auto-append the lifecycle timeline on every status-changing save. The few
// findOneAndUpdate status writes (e.g. trip completion) push their own entry.
BookingSchema.pre('save', function () {
	if (this.isNew) {
		this.statusHistory = [{ status: this.status, at: new Date() }];
	} else if (this.isModified('status')) {
		this.statusHistory = [...(this.statusHistory ?? []), { status: this.status, at: new Date() }];
	}
});

// Hide soft-deleted bookings from every find. { deletedAt: null } also matches
// documents where the field is absent, so legacy rows stay visible.
BookingSchema.pre(/^find/, function (this: mongoose.Query<unknown, IBooking>) {
	if (this.getFilter().deletedAt === undefined) {
		this.where({ deletedAt: null });
	}
});

const BookingDB = mongoose.model<IBooking>('Booking', BookingSchema);

export default BookingDB;
