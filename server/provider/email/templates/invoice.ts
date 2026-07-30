interface InvoiceEmailDetails {
	customerName: string;
	invoiceNumber: string;
	invoiceTypeLabel: string;
	invoiceDate: string;
	grandTotal: number;
	currency: string;
	companyName: string;
	supportEmail: string;
}

export default function InvoiceEmailTemplate(details: InvoiceEmailDetails) {
	const {
		customerName,
		invoiceNumber,
		invoiceTypeLabel,
		invoiceDate,
		grandTotal,
		currency,
		companyName,
		supportEmail,
	} = details;

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Your Invoice — ${invoiceNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h1 style="color: #2c3e50; margin-top: 0;">Your Invoice</h1>
		<p>Hello ${customerName},</p>
		<p>Thank you for your payment. Your ${invoiceTypeLabel} invoice is attached to this email as a PDF.</p>
		<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
			<tr>
				<td style="padding: 8px 0; color: #7f8c8d;">Invoice Number</td>
				<td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoiceNumber}</td>
			</tr>
			<tr>
				<td style="padding: 8px 0; color: #7f8c8d;">Invoice Date</td>
				<td style="padding: 8px 0; text-align: right;">${invoiceDate}</td>
			</tr>
			<tr>
				<td style="padding: 8px 0; color: #7f8c8d;">Amount Paid</td>
				<td style="padding: 8px 0; text-align: right; font-weight: bold;">${currency} ${grandTotal.toLocaleString()}</td>
			</tr>
		</table>
		<p>If you have any questions about this invoice, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>

		<p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
			Best regards,<br>
			${companyName} Team
		</p>
	</div>
</body>
</html>`;
}
