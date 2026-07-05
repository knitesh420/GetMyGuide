interface TripStartedDetails {
	touristName: string;
	guideName: string;
	city: string;
}

export default function TripStartedTemplate(details: TripStartedDetails) {
	const { touristName, guideName, city } = details;

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Your Trip Has Started</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h1 style="color: #2c3e50; margin-top: 0;">Your Trip Has Started</h1>
		<p>Hello ${touristName},</p>
		<p>Your guide <strong>${guideName}</strong> has started your trip in <strong>${city}</strong>. We hope you have a wonderful experience!</p>

		<p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
			Best regards,<br>
			Get My Guide Team
		</p>
	</div>
</body>
</html>`;
}
