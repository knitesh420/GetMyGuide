interface GuideAcceptedDetails {
	guideName: string;
	city: string;
	date: string;
	noOfPersons: number;
}

export default function GuideAcceptedTemplate(details: GuideAcceptedDetails) {
	const { guideName, city, date, noOfPersons } = details;

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Guide Accepted Assignment</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h1 style="color: #2c3e50; margin-top: 0;">Guide Accepted the Assignment</h1>
		<p>Hello Admin,</p>
		<p><strong>${guideName}</strong> has accepted the assignment for the following booking. A trip has been created and is ready to start.</p>

		<div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
			<p><strong>Guide:</strong> ${guideName}</p>
			<p><strong>City:</strong> ${city}</p>
			<p><strong>Date:</strong> ${date}</p>
			<p><strong>Number of Persons:</strong> ${noOfPersons}</p>
		</div>

		<p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
			Best regards,<br>
			Get My Guide Team
		</p>
	</div>
</body>
</html>`;
}
