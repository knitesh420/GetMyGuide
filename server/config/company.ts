// Invoice/billing branding. Kept separate from the per-email hardcoded
// `from:` strings in provider/email/index.ts (which are intentionally left
// untouched) — this file is only consumed by the new Invoice module.
export const COMPANY_NAME = process.env.COMPANY_NAME ?? 'Get My Guide';
export const COMPANY_SUPPORT_EMAIL = process.env.COMPANY_SUPPORT_EMAIL ?? 'support@getmyguide.in';
export const COMPANY_SUPPORT_PHONE = process.env.COMPANY_SUPPORT_PHONE ?? '+91-00000-00000';
export const COMPANY_WEBSITE = process.env.COMPANY_WEBSITE ?? 'https://getmyguide.in';
export const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS ?? 'India';
export const COMPANY_LOGO_URL = process.env.COMPANY_LOGO_URL ?? '';
