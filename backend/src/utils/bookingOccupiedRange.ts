import IBooking from '@mongo/types/booking';

export interface DateRange {
	start: Date;
	end: Date;
}

export function startOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function endOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(23, 59, 59, 999);
	return d;
}

/**
 * A booking only carries a single travel date plus a duration/over-night-stay
 * config — there is no explicit end date. This derives the calendar range a
 * guide is occupied for: same day for half/full-day bookings, extended by
 * `over_night_stay` nights for outstation bookings.
 */
export function getBookingOccupiedRange(booking: Pick<IBooking, 'travel_details' | 'booking_configuration'>): DateRange {
	const start = startOfDay(new Date(booking.travel_details.date));
	const nights = booking.booking_configuration.outstation?.over_night_stay || 0;
	const end = endOfDay(new Date(start.getTime() + nights * 24 * 60 * 60 * 1000));
	return { start, end };
}

export function rangesOverlap(a: DateRange, b: DateRange): boolean {
	return a.start <= b.end && b.start <= a.end;
}
