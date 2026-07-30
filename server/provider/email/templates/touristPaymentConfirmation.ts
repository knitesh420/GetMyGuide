export default function TouristPaymentConfirmationTemplate(bookingDetails: {
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
}) {
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Payment Confirmation - BookMyGuide</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
	<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
		<!-- Header -->
		<div style="text-align: center; margin-bottom: 30px;">
			<h1 style="color: #ff6b00; margin: 0; font-size: 28px;">✓ Payment Successful!</h1>
			<p style="color: #666; font-size: 14px; margin-top: 5px;">Your tour guide booking has been confirmed</p>
		</div>

		<!-- Success Message -->
		<div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin-bottom: 25px;">
			<p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 16px;">Thank you for your booking!</p>
			<p style="margin: 10px 0 0 0; color: #555; font-size: 14px;">We've received your payment and confirmed your tour guide reservation.</p>
		</div>

		<!-- Booking Details -->
		<h2 style="color: #333; font-size: 20px; border-bottom: 2px solid #ff6b00; padding-bottom: 10px; margin-bottom: 20px;">Booking Details</h2>
		
		<div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
			<table style="width: 100%; border-collapse: collapse;">
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Name:</td>
					<td style="padding: 10px 0; text-align: right; font-weight: bold; color: #333;">${bookingDetails.name}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Email:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${bookingDetails.email}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Phone:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${bookingDetails.phone}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">City:</td>
					<td style="padding: 10px 0; text-align: right; font-weight: bold; color: #333;">${bookingDetails.city}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Places to Visit:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${bookingDetails.places.join(', ')}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Date:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${new Date(bookingDetails.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Duration:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${bookingDetails.duration}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Number of Persons:</td>
					<td style="padding: 10px 0; text-align: right; font-weight: bold; color: #333;">${bookingDetails.persons}</td>
				</tr>
			</table>
		</div>

		<!-- Payment Details -->
		<h2 style="color: #333; font-size: 20px; border-bottom: 2px solid #ff6b00; padding-bottom: 10px; margin-bottom: 20px;">Payment Information</h2>
		
		<div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 2px solid #ff9800;">
			<table style="width: 100%; border-collapse: collapse;">
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Amount Paid:</td>
					<td style="padding: 10px 0; text-align: right; font-weight: bold; color: #ff6b00; font-size: 18px;">₹${bookingDetails.amount.toLocaleString()}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Transaction ID:</td>
					<td style="padding: 10px 0; text-align: right; color: #333; font-family: monospace; font-size: 12px;">${bookingDetails.transactionId}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Order ID:</td>
					<td style="padding: 10px 0; text-align: right; color: #333; font-family: monospace; font-size: 12px;">${bookingDetails.orderId}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Payment Status:</td>
					<td style="padding: 10px 0; text-align: right;"><span style="background-color: #4caf50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">PAID</span></td>
				</tr>
			</table>
		</div>

		<!-- Next Steps -->
		<div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin-bottom: 20px;">
			<h3 style="color: #1976d2; margin-top: 0; font-size: 16px;">📋 What's Next?</h3>
			<ul style="margin: 10px 0; padding-left: 20px; color: #555;">
				<li style="margin-bottom: 8px;">Our team will assign a verified guide to your booking within 24 hours</li>
				<li style="margin-bottom: 8px;">You will receive guide details via email and SMS</li>
				<li style="margin-bottom: 8px;">The guide will contact you 24 hours before your tour</li>
				<li>Free cancellation available up to 24 hours before the tour</li>
			</ul>
		</div>

		<!-- Contact Info -->
		<div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0; margin-top: 20px;">
			<p style="color: #666; font-size: 14px; margin: 5px 0;">Need help? Contact us:</p>
			<p style="color: #ff6b00; font-weight: bold; margin: 5px 0;">📧 support@bookmyguide.com</p>
			<p style="color: #ff6b00; font-weight: bold; margin: 5px 0;">📞 +91-XXXXXXXXXX</p>
		</div>

		<!-- Footer -->
		<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
			<p style="color: #999; font-size: 12px; margin: 5px 0;">This is an automated email. Please do not reply to this message.</p>
			<p style="color: #999; font-size: 12px; margin: 5px 0;">© ${new Date().getFullYear()} BookMyGuide. All rights reserved.</p>
		</div>
	</div>
</body>
</html>`;
}
