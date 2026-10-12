import { GUIDE_MEMBERSHIP_FEE } from '@config/const';

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		const entities: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		};
		return entities[character];
	});
}

export default function GuideMembershipReminderTemplate(details: {
	name: string;
	expiryDate: string;
	renewalUrl: string;
}) {
	return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guide membership renewal</title></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b">
  <main style="max-width:560px;margin:0 auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
    <h1 style="margin:0 0 16px;font-size:22px">Membership renewal reminder</h1>
    <p>Hello ${escapeHtml(details.name)},</p>
    <p>Your Get My Guide membership expires on <strong>${escapeHtml(details.expiryDate)}</strong>.</p>
    <p>Renew for <strong>₹${GUIDE_MEMBERSHIP_FEE}</strong> to keep your guide profile eligible for public listings and new bookings.</p>
    <p style="margin:24px 0"><a href="${escapeHtml(details.renewalUrl)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px">Renew membership</a></p>
    <p style="font-size:13px;color:#64748b">This is a reminder only; no automatic charge will be made.</p>
  </main>
</body>
</html>`;
}
