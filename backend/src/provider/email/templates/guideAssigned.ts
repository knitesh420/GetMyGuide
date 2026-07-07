interface GuideAssignedDetails {
	guideName: string;
	city: string;
	places: string[];
	date: string;
	noOfPersons: number;
	adminNotes?: string;
}

export default function GuideAssignedTemplate(details: GuideAssignedDetails) {
	const { guideName, city, places, date, noOfPersons, adminNotes } = details;

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>New Assignment Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h1 style="color: #2c3e50; margin-top: 0;">New Assignment Request</h1>
		<p>Hello ${guideName},</p>
		<p>You have been proposed as the guide for a new booking. Please review the details below and respond from your Guide Dashboard.</p>

		<div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
			<p><strong>City:</strong> ${city}</p>
			<p><strong>Places to Visit:</strong> ${places.join(', ')}</p>
			<p><strong>Date:</strong> ${date}</p>
			<p><strong>Number of Persons:</strong> ${noOfPersons}</p>
			${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
		</div>

		<p>Please log in to your Guide Dashboard to accept or decline this assignment.</p>

		<p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
			Best regards,<br>
			Get My Guide Team
		</p>
	</div>
</body>
</html>`;
}
