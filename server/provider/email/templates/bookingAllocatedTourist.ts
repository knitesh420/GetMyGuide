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

export default function BookingAllocatedTouristTemplate(bookingDetails: BookingDetails) {
	const { tourist_info, travel_details, guide_preferences, booking_configuration, guide_info } =
		bookingDetails;
	const date = new Date(travel_details.date).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Guide Allocated to Your Booking</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h1 style="color: #2c3e50; margin-top: 0;">Guide Allocated to Your Booking</h1>
		<p>Hello ${tourist_info.name},</p>
		
		<p>Great news! A guide has been allocated to your customised booking. Here are the complete details:</p>
		
		<div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
			<h2 style="color: #3498db; margin-top: 0;">Your Booking Details</h2>
			
			<h3 style="color: #2c3e50;">Tourist Information</h3>
			<p><strong>Name:</strong> ${tourist_info.name}</p>
			<p><strong>Gender:</strong> ${tourist_info.gender}</p>
			<p><strong>Phone:</strong> ${tourist_info.phone}</p>
			<p><strong>Email:</strong> ${tourist_info.email}</p>
			<p><strong>Country:</strong> ${tourist_info.country}</p>
			
			<h3 style="color: #2c3e50;">Travel Details</h3>
			<p><strong>City:</strong> ${travel_details.city}</p>
			<p><strong>Places to Visit:</strong> ${travel_details.places.join(', ')}</p>
			<p><strong>Date:</strong> ${date}</p>
			<p><strong>Number of Persons:</strong> ${travel_details.no_of_person}</p>
			<p><strong>Hotel Required:</strong> ${travel_details.preferences.hotel ? 'Yes' : 'No'}</p>
			<p><strong>Taxi Required:</strong> ${travel_details.preferences.taxi ? 'Yes' : 'No'}</p>
			
			<h3 style="color: #2c3e50;">Guide Preferences</h3>
			<p><strong>Preferred Languages:</strong> ${guide_preferences.guide_language.join(', ') || 'None specified'}</p>
			<p><strong>Preferred Gender:</strong> ${guide_preferences.gender}</p>
			
			<h3 style="color: #2c3e50;">Booking Configuration</h3>
			<p><strong>Duration:</strong> ${booking_configuration.duration}</p>
			<p><strong>Foreign Language Required:</strong> ${booking_configuration.foreign_language_required ? 'Yes' : 'No'}</p>
			<p><strong>Early/Late Hours:</strong> ${booking_configuration.early_late_hours ? 'Yes' : 'No'}</p>
			<p><strong>Extra City Allowances:</strong> ${booking_configuration.extra_city_allowances ? 'Yes' : 'No'}</p>
			${
				booking_configuration.outstation
					? `
			<h4 style="color: #2c3e50;">Outstation Details</h4>
			${booking_configuration.outstation.distance > 0 ? `<p><strong>Distance:</strong> ${booking_configuration.outstation.distance} km</p>` : ''}
			${booking_configuration.outstation.over_night_stay > 0 ? `<p><strong>Overnight Stay:</strong> ${booking_configuration.outstation.over_night_stay} nights</p>` : ''}
			${booking_configuration.outstation.accomodation_meals ? '<p><strong>Accommodation & Meals:</strong> Yes</p>' : ''}
			${booking_configuration.outstation.special_excursion.length > 0 ? `<p><strong>Special Excursions:</strong> ${booking_configuration.outstation.special_excursion.join(', ')}</p>` : ''}
			`
					: ''
			}
			${booking_configuration.special_event_allowances.length > 0 ? `<p><strong>Special Event Allowances:</strong> ${booking_configuration.special_event_allowances.join(', ')}</p>` : ''}
			<p><strong>Total Price:</strong> ₹${booking_configuration.price.toLocaleString()}</p>
		</div>
		
		${
			guide_info
				? `
		<div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
			<h2 style="color: #2c3e50; margin-top: 0;">Your Allocated Guide</h2>
			<p><strong>Name:</strong> ${guide_info.name}</p>
			<p><strong>Email:</strong> ${guide_info.email}</p>
			<p><strong>Phone:</strong> ${guide_info.phone}</p>
			<p style="margin-top: 15px;">You can contact your guide directly using the contact information provided above.</p>
		</div>
		`
				: ''
		}
		
		<p>If you have any questions or need to make changes to your booking, please contact our support team.</p>
		
		<p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
			Best regards,<br>
			Get My Guide Team
		</p>
	</div>
</body>
</html>`;
}
