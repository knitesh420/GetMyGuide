export default function PaymentLinkTemplate(paymentLink: string, name: string) {
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Guide Enrollment Payment</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h1 style="color: #2c3e50; margin-top: 0;">Guide Enrollment Payment Required</h1>
		<p>Hello ${name},</p>
		
		<p>Your guide enrollment application has been reviewed and approved. To complete your enrollment, please proceed with the payment.</p>
		
		<div style="text-align: center; margin: 30px 0;">
			<a href="${paymentLink}" style="background-color: #3498db; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Complete Payment</a>
		</div>
		
		<p>Or copy and paste this link into your browser:</p>
		<p style="word-break: break-all; color: #3498db;">${paymentLink}</p>
		
		<p style="color: #7f8c8d; font-size: 14px;">This payment link will remain valid until you complete the payment.</p>
		
		<p>If you have any questions or need assistance, please contact our support team.</p>
		
		<p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
			Best regards,<br>
			Get My Guide Team
		</p>
	</div>
</body>
</html>`;
}
