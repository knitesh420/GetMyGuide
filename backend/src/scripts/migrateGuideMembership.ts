/**
 * Backfill a `Guide` membership document for every existing guide Account
 * created under the old one-time-fee anonymous enrollment flow.
 *
 * MUST be run — and confirmed complete — BEFORE deploying the rewritten
 * `/guide/all` + `/guide/:id` filters, which query the `Guide` collection
 * (isVisible + unexpired membershipExpiryDate) instead of `Account.status`.
 * Skipping this means every currently-visible guide vanishes from public
 * listing the instant the new code ships.
 *
 * Grandfathering policy (goodwill grace period, since these guides already
 * paid once under the old one-time-fee model):
 *   - registrationCompleted: true  — they are NOT forced through the new
 *     profile form as a blocking gate; the dashboard shows a non-blocking
 *     "complete your profile" nudge instead for any fields left empty.
 *   - paymentStatus: 'success', isVisible: true
 *   - membershipStartDate = migrationRunDate
 *   - membershipExpiryDate = migrationRunDate + GUIDE_MEMBERSHIP_DURATION_DAYS
 *     (a full fresh cycle starting now, regardless of when they originally
 *     paid under the old model).
 *
 * Does NOT touch passwords. The pre-existing bug where a guide's
 * auto-generated password was never emailed to them (see GuideService
 * .confirmPayment) is NOT fixed here — the new OTP-based Forgot Password
 * flow (role-agnostic in AuthService) is their de facto first-login path.
 *
 * Usage:
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/migrateGuideMembership.ts [--dry-run]
 */
import dotenv from 'dotenv';
dotenv.config();

import { GUIDE_MEMBERSHIP_DURATION_DAYS, DATABASE_URL } from '@config/const';
import connectDB from '@mongo';
import { AccountDB, GuideDB, GuideEnrollmentDB } from '@mongo';

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const migrationRunDate = new Date();
	const membershipExpiryDate = new Date(
		migrationRunDate.getTime() + GUIDE_MEMBERSHIP_DURATION_DAYS * 24 * 60 * 60 * 1000
	);

	await connectDB(DATABASE_URL);
	try {
		// Today's exact public-visibility definition — so nobody who is
		// currently visible disappears once the new filter ships.
		const guideAccounts = await AccountDB.find({
			role: 'guide',
			status: 'verified',
			isActive: true,
		});

		let migrated = 0;
		let skippedExisting = 0;
		let noEnrollmentMatch = 0;

		for (const account of guideAccounts) {
			const existing = await GuideDB.findOne({ accountId: account._id });
			if (existing) {
				skippedExisting++;
				continue;
			}

			const enrollment = await GuideEnrollmentDB.findOne({
				email: account.email.toLowerCase(),
			});
			if (!enrollment) {
				noEnrollmentMatch++;
				console.warn(
					`No GuideEnrollment match for guide account ${account._id.toString()} (${account.email}) — creating with empty profile fields.`
				);
			}

			if (dryRun) {
				migrated++;
				continue;
			}

			await GuideDB.create({
				accountId: account._id,
				languages: enrollment?.languages ?? [],
				city: enrollment?.city ?? '',
				profileImage: enrollment?.photo ?? '',
				registrationCompleted: true,
				paymentStatus: 'success',
				isVisible: true,
				membershipStartDate: migrationRunDate,
				membershipExpiryDate,
			});
			migrated++;
		}

		const prefix = dryRun ? '[dry-run] Would migrate' : 'Migrated';
		console.log(
			`${prefix} ${migrated} guide account(s). Skipped ${skippedExisting} (already migrated). ` +
				`${noEnrollmentMatch} had no matching GuideEnrollment record.`
		);
	} catch (err: any) {
		console.error('Migration failed:', err?.message ?? err);
		process.exitCode = 1;
	} finally {
		const mongoose = await import('mongoose');
		await mongoose.default.disconnect();
	}
}

main();
