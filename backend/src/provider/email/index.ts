import { RESEND_API_KEY } from '@config/const';
import { error as logError } from 'node-be-utilities';
import { Resend } from 'resend';
import {
	AdminOtpTemplate,
	BookingAllocatedGuideTemplate,
	BookingAllocatedTouristTemplate,
	GuideCredentialsTemplate,
	PasswordResetTemplate,
	PasswordResetOtpTemplate,
	PaymentLinkTemplate,
	RegistrationOtpTemplate,
	WelcomeEmailTemplate,
	TouristPaymentConfirmationTemplate,
	GuidePaymentConfirmationTemplate,
	GuideAssignedTemplate,
	GuideAcceptedTemplate,
	TripStartedTemplate,
	TripCompletedTemplate,
} from './templates';

const resend = new Resend(RESEND_API_KEY);

export async function sendSimpleText(to: string, subject: string, value: string) {
	const { error } = await resend.emails.send({
		from: 'Info <no-reply@xyz.com>',
		to: [to],
		subject: subject,
		html: `<p>${value}</p>`,
	});

	if (error) {
		logError('Resend Error: Error Sending feedback message', error);
		return false;
	}
	return true;
}

export async function sendWelcomeEmail(to: string) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Welcome to ABC!',
		html: WelcomeEmailTemplate(to),
	});

	if (error) {
		logError('Resend Error: Error Sending welcome message', error);
		return false;
	}
	return true;
}

export async function sendPasswordResetEmail(to: string, token: string, resetUrl?: string) {
	// Construct reset link - if resetUrl is provided, append token, otherwise use token as full URL
	const resetLink = resetUrl ? `${resetUrl}?token=${token}` : token; // If no URL provided, token should be the full URL

	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Password reset request for ABC',
		html: PasswordResetTemplate(resetLink),
	});

	if (error) {
		logError('Resend Error: Error Sending reset message', error);
		return false;
	}
	return true;
}

export async function sendGuideCredentialsEmail(to: string, email: string, password: string) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Your Guide Account Credentials - Get My Guide',
		html: GuideCredentialsTemplate(email, password),
	});

	if (error) {
		logError('Resend Error: Error Sending guide credentials email', error);
		return false;
	}
	return true;
}

export async function sendPaymentLinkEmail(to: string, name: string, paymentLink: string) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Guide Enrollment Payment Required - Get My Guide',
		html: PaymentLinkTemplate(paymentLink, name),
	});

	if (error) {
		logError('Resend Error: Error Sending payment link email', error);
		return false;
	}
	return true;
}

interface BookingDetails {
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
		date: Date | string;
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
	guide_info?: {
		name: string;
		email: string;
		phone: string;
	};
}

export async function sendBookingAllocatedTouristEmail(to: string, bookingDetails: BookingDetails) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Guide Allocated to Your Booking - Get My Guide',
		html: BookingAllocatedTouristTemplate(bookingDetails),
	});

	if (error) {
		logError('Resend Error: Error Sending booking allocated email to tourist', error);
		return false;
	}
	return true;
}

export async function sendBookingAllocatedGuideEmail(to: string, bookingDetails: BookingDetails) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'New Booking Allocated to You - Get My Guide',
		html: BookingAllocatedGuideTemplate(bookingDetails),
	});

	if (error) {
		logError('Resend Error: Error Sending booking allocated email to guide', error);
		return false;
	}
	return true;
}

export async function sendTouristPaymentConfirmationEmail(
	to: string,
	bookingDetails: {
		name: string;
		email: string;
		phone: string;
		city: string;
		places: string[];
		date: string;
		duration: string;
		persons: number;
		amount: number;
		transactionId: string;
		orderId: string;
	}
) {
	try {
		const htmlContent = TouristPaymentConfirmationTemplate(bookingDetails);

		const { error } = await resend.emails.send({
			from: 'Get My Guide <support@getmyguide.in>',
			to: [to],
			subject: 'Payment Confirmation - Your Tour Guide Booking',
			html: htmlContent,
		});

		if (error) {
			logError('Resend Error: Error Sending tourist payment confirmation email', error);
			return false;
		}

		return true;
	} catch (error) {
		logError('Exception in sendTouristPaymentConfirmationEmail', error);
		return false;
	}
}

export async function sendAdminOtpEmail(to: string, otp: string) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Your Admin Login Code - Get My Guide',
		html: AdminOtpTemplate(otp),
	});

	if (error) {
		logError('Resend Error: Error Sending admin OTP email', error);
		return false;
	}
	return true;
}

export async function sendRegistrationOtpEmail(to: string, otp: string) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Verify Your Email - Get My Guide',
		html: RegistrationOtpTemplate(otp),
	});

	if (error) {
		logError('Resend Error: Error Sending registration OTP email', error);
		return false;
	}
	return true;
}

export async function sendPasswordResetOtpEmail(to: string, otp: string) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Reset Your Password - Get My Guide',
		html: PasswordResetOtpTemplate(otp),
	});

	if (error) {
		logError('Resend Error: Error Sending password reset OTP email', error);
		return false;
	}
	return true;
}

export async function sendGuideAssignedEmail(
	to: string,
	details: {
		guideName: string;
		city: string;
		places: string[];
		date: string;
		noOfPersons: number;
		adminNotes?: string;
	}
) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'New Assignment Request - Get My Guide',
		html: GuideAssignedTemplate(details),
	});

	if (error) {
		logError('Resend Error: Error Sending guide assigned email', error);
		return false;
	}
	return true;
}

export async function sendGuideAcceptedEmail(
	to: string,
	details: { guideName: string; city: string; date: string; noOfPersons: number }
) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Guide Accepted Assignment - Get My Guide',
		html: GuideAcceptedTemplate(details),
	});

	if (error) {
		logError('Resend Error: Error Sending guide accepted email', error);
		return false;
	}
	return true;
}

export async function sendTripStartedEmail(
	to: string,
	details: { touristName: string; guideName: string; city: string }
) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Your Trip Has Started - Get My Guide',
		html: TripStartedTemplate(details),
	});

	if (error) {
		logError('Resend Error: Error Sending trip started email', error);
		return false;
	}
	return true;
}

export async function sendTripCompletedEmail(
	to: string,
	details: { touristName: string; guideName: string; city: string }
) {
	const { error } = await resend.emails.send({
		from: 'Get My Guide <support@getmyguide.in>',
		to: [to],
		subject: 'Your Trip Is Complete - Get My Guide',
		html: TripCompletedTemplate(details),
	});

	if (error) {
		logError('Resend Error: Error Sending trip completed email', error);
		return false;
	}
	return true;
}

export async function sendGuidePaymentConfirmationEmail(
	to: string,
	guideDetails: {
		name: string;
		email: string;
		phone: string;
		city: string;
		experience: string;
		languages: string[];
		amount: number;
		transactionId: string;
		orderId: string;
	}
) {
	try {
		const htmlContent = GuidePaymentConfirmationTemplate(guideDetails);

		const { error } = await resend.emails.send({
			from: 'Get My Guide <support@getmyguide.in>',
			to: [to],
			subject: 'Payment Confirmation - Guide Registration Successful',
			html: htmlContent,
		});

		if (error) {
			logError('Resend Error: Error Sending guide payment confirmation email', error);
			return false;
		}

		return true;
	} catch (error) {
		logError('Exception in sendGuidePaymentConfirmationEmail', error);
		return false;
	}
}
