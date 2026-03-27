export default function GuideCredentialsTemplate(email: string, password: string) {
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Your Guide Account Credentials</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h1 style="color: #2c3e50; margin-top: 0;">Welcome to Get My Guide!</h1>
		<p>Your guide account has been successfully created. Please use the following credentials to log in:</p>
		
		<div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
			<p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
			<p style="margin: 10px 0;"><strong>Password:</strong> ${password}</p>
		</div>
		
		<p style="color: #e74c3c; font-weight: bold;">⚠️ Important: Please change your password after your first login for security purposes.</p>
		
		<p>You can now log in to your account and start offering your guide services.</p>
		
		<p>If you have any questions, please contact our support team.</p>
		
		<p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
			Best regards,<br>
			Get My Guide Team
		</p>
	</div>
</body>
</html>`;
}
