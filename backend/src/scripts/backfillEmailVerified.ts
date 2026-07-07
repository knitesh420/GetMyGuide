/**
 * Backfill `emailVerified` on every existing Account.
 *
 * MUST be run — and confirmed complete — against a database BEFORE
 * AuthService.login's `emailVerified` gate is deployed against it. Mongoose
 * schema `default` values only apply to newly-constructed documents; an
 * existing document that lacks the field reads back as `undefined`, and
 * `!undefined` is truthy, so the login gate would otherwise lock out every
 * pre-existing account (including the admin and every paid guide) instantly.
 *
 * This marks all pre-existing accounts as verified (they already went
 * through some prior verification/payment step to exist at all); only
 * accounts created after this backfill runs start out `emailVerified: false`
 * by schema default and must earn it via OTP registration or a completed
 * password reset.
 *
 * Usage:
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/backfillEmailVerified.ts [--dry-run]
 */
import dotenv from 'dotenv';
dotenv.config();

import { DATABASE_URL } from '@config/const';
import connectDB from '@mongo';
import { AccountDB } from '@mongo';

async function main() {
	const dryRun = process.argv.includes('--dry-run');

	await connectDB(DATABASE_URL);
	try {
		const filter = { emailVerified: { $exists: false } };
		const matched = await AccountDB.countDocuments(filter);

		if (dryRun) {
			console.log(`[dry-run] Would set emailVerified:true on ${matched} account(s).`);
			return;
		}

		const result = await AccountDB.updateMany(filter, { $set: { emailVerified: true } });
		console.log(
			`Backfill complete: matched ${result.matchedCount}, modified ${result.modifiedCount}.`
		);

		const remaining = await AccountDB.countDocuments(filter);
		if (remaining > 0) {
			console.error(`WARNING: ${remaining} account(s) still missing emailVerified after backfill.`);
			process.exitCode = 1;
		}
	} catch (err: any) {
		console.error('Backfill failed:', err?.message ?? err);
		process.exitCode = 1;
	} finally {
		const mongoose = await import('mongoose');
		await mongoose.default.disconnect();
	}
}

main();
