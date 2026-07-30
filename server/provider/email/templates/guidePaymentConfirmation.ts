export default function GuidePaymentConfirmationTemplate(guideDetails: {
	name: string;
	email: string;
	phone: string;
	city: string;
	experience: string;
	languages: string[];
	amount: number;
	transactionId: string;
	orderId: string;
}) {
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Payment Confirmation - Guide Registration</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
	<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
		<!-- Header -->
		<div style="text-align: center; margin-bottom: 30px;">
			<h1 style="color: #ff6b00; margin: 0; font-size: 28px;">✓ Payment Successful!</h1>
			<p style="color: #666; font-size: 14px; margin-top: 5px;">Your guide registration has been confirmed</p>
		</div>

		<!-- Success Message -->
		<div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin-bottom: 25px;">
			<p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 16px;">Welcome to BookMyGuide!</p>
			<p style="margin: 10px 0 0 0; color: #555; font-size: 14px;">We've received your payment and confirmed your guide registration. Your account credentials will be sent to you shortly.</p>
		</div>

		<!-- Registration Details -->
		<h2 style="color: #333; font-size: 20px; border-bottom: 2px solid #ff6b00; padding-bottom: 10px; margin-bottom: 20px;">Registration Details</h2>
		
		<div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
			<table style="width: 100%; border-collapse: collapse;">
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Name:</td>
					<td style="padding: 10px 0; text-align: right; font-weight: bold; color: #333;">${guideDetails.name}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Email:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${guideDetails.email}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Phone:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${guideDetails.phone}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">City:</td>
					<td style="padding: 10px 0; text-align: right; font-weight: bold; color: #333;">${guideDetails.city}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Experience:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${guideDetails.experience}</td>
				</tr>
				<tr>
					<td style="padding: 10px 0; color: #666; font-size: 14px;">Languages:</td>
					<td style="padding: 10px 0; text-align: right; color: #333;">${guideDetails.languages.join(', ')}</td>
				</tr>
			</table>
		</div>

		<!-- Payment Details -->
		<h2 style="color: #333; font-size: 20px; border-bottom: 2px solid #ff6b00; padding-bottom: 10px; margin-bottom: 20px;">Payment Details</h2>
		
		<div style="background-color: #fff8e1; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
			<table style="width: 100%; border-collapse: collapse;">
				<tr>
					<td style="padding: 8px 0; color: #666; font-size: 14px;">Registration Fee:</td>
					<td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333; font-size: 18px;">₹${guideDetails.amount}</td>
				</tr>
				<tr style="border-top: 1px solid #ddd;">
					<td style="padding: 8px 0; color: #666; font-size: 13px;">Transaction ID:</td>
					<td style="padding: 8px 0; text-align: right; color: #666; font-size: 13px; font-family: monospace;">${guideDetails.transactionId}</td>
				</tr>
				<tr>
					<td style="padding: 8px 0; color: #666; font-size: 13px;">Order ID:</td>
					<td style="padding: 8px 0; text-align: right; color: #666; font-size: 13px; font-family: monospace;">${guideDetails.orderId}</td>
				</tr>
			</table>
		</div>

		<!-- Next Steps -->
		<div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin-bottom: 25px;">
			<h3 style="color: #1976d2; margin: 0 0 10px 0; font-size: 16px;">📋 Next Steps:</h3>
			<ol style="margin: 10px 0 0 20px; padding: 0; color: #555;">
				<li style="margin-bottom: 8px;">Start receiving tour guide bookings!</li>
			</ol>
		</div>

		<!-- Contact Support -->
		<div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
			<p style="color: #666; font-size: 13px; margin: 0 0 10px 0;">Need help? Contact our support team</p>
			<p style="margin: 0;">
				<a href="mailto:support@bookmyguide.com" style="color: #ff6b00; text-decoration: none; font-weight: bold;">support@bookmyguide.com</a>
			</p>
		</div>

		<!-- Footer -->
		<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
			<p style="color: #999; font-size: 12px; margin: 0;">
				© 2026 BookMyGuide. All rights reserved.
			</p>
			<p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
				This is an automated email. Please do not reply to this message.
			</p>
		</div>
	</div>
</body>
</html>`;
}
