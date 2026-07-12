import { Document, Types } from 'mongoose';

export default interface IBooking extends Document {
	_id: Types.ObjectId;
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
	linked_to?: Types.ObjectId;
	transaction_id: string;
	allocated_guide?: Types.ObjectId;
	// Package-tour bookings reuse this document but set booking_type='package'
	// and carry the package reference, trip end date, and advance/balance split.
	//
	// 'guide_direct' is the same shape again for the flow where a tourist picks a
	// specific guide off their profile and pays an advance against that guide's
	// published rate — no admin allocation step, the guide is set at creation.
	booking_type?: 'guide' | 'package' | 'guide_direct';
	package?: Types.ObjectId;
	end_date?: Date;
	advance_paid?: number;
	balance_due?: number;
	/** Set once the balance has been collected; balance_due goes to 0 alongside it. */
	balance_paid_at?: Date;
	/** Razorpay order for the in-flight balance payment, matched at verify time. */
	balance_order_id?: string;
	cancellation?: {
		reason?: string;
		requestedBy?: Types.ObjectId;
		cancelledAt?: Date;
		refundRequest?: Types.ObjectId;
	};
	status: 'payment-pending' | 'successful' | 'confirmed' | 'allocated' | 'completed' | 'cancelled';
	bookingCode?: string;
	statusHistory?: { status: string; at?: Date; by?: Types.ObjectId; note?: string }[];
	deletedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
