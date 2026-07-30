/**
 * Admin seed script.
 *
 * Usage:
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/seedAdmin.ts
 *
 * Reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PHONE / ADMIN_PASSWORD from the
 * environment. This is the ONLY supported way to provision an admin account in
 * production — the public signup endpoint cannot create admins.
 */
import dotenv from 'dotenv';
dotenv.config();

import { DATABASE_URL } from '@config/const';
import connectDB from '@mongo';
import AuthService from '@services/auth';

async function main() {
	const name = process.env.ADMIN_NAME;
	const email = process.env.ADMIN_EMAIL;
	const phone = process.env.ADMIN_PHONE;
	const password = process.env.ADMIN_PASSWORD;

	if (!name || !email || !phone || !password) {
		console.error('Missing one of: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD');
		process.exit(1);
	}

	await connectDB(DATABASE_URL);
	try {
		const admin = await AuthService.createAdmin({ name, email, phone, password });
		console.log('Created admin:', admin);
	} catch (err: any) {
		console.error('Failed to create admin:', err?.message ?? err);
		process.exitCode = 1;
	} finally {
		const mongoose = await import('mongoose');
		await mongoose.default.disconnect();
	}
}

main();
