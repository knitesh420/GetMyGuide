/**
 * Backfill `approvalStatus` onto Guide documents that predate the admin KYC
 * review flow.
 *
 * Why this exists: guides who registered before the review flow shipped have no
 * `approvalStatus` at all. Rather than delist every one of them the moment the
 * feature went live, utils/guideApproval.ts reads an absent status as approved
 * *if the guide is already publicly visible* — they were vetted, or not, under
 * the old implicit "pay for membership and you're listed" rule. This script
 * makes that inference explicit in the data, after which the fallback in
 * guideApproval.ts stops mattering for these rows.
 *
 * The mapping:
 *   isVisible === true   -> 'approved'  (grandfathered: they were already live)
 *   isVisible === false  -> 'pending'   (never listed; must go through review)
 *
 * SAFE BY DEFAULT — this is a DRY RUN and writes nothing unless you pass
 * `--commit`. The local .env points at the live production cluster, so the
 * default has to be the harmless one.
 *
 * Idempotent: only ever touches documents that still lack an approvalStatus, so
 * re-running it after a partial run (or after new guides have been reviewed by
 * hand) cannot overwrite a real admin decision.
 *
 * Usage:
 *   # preview only — no writes:
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/backfillGuideApproval.ts
 *
 *   # actually write (TAKE A BACKUP FIRST):
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/backfillGuideApproval.ts --commit
 */
import dotenv from 'dotenv';
dotenv.config();

import { DATABASE_URL } from '@config/const';
import connectDB, { GuideDB } from '@mongo';
import mongoose from 'mongoose';

const COMMIT = process.argv.includes('--commit');

async function main() {
	if (!DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}

	await connectDB(DATABASE_URL);
	console.log(`Connected. Mode: ${COMMIT ? 'COMMIT (will write)' : 'DRY RUN (no writes)'}\n`);

	// `$exists: false` is the whole safety story here: a guide an admin has
	// already approved or rejected by hand is simply not in this set.
	const pending = await GuideDB.find({ approvalStatus: { $exists: false } })
		.select('_id guideCode isVisible registrationCompleted membershipExpiryDate')
		.lean();

	if (pending.length === 0) {
		console.log('Nothing to backfill — every guide already has an approvalStatus.');
		return;
	}

	const toApprove = pending.filter((g) => g.isVisible === true);
	const toPend = pending.filter((g) => g.isVisible !== true);

	console.log(`Guides without an approvalStatus: ${pending.length}`);
	console.log(`  -> 'approved' (currently visible, grandfathered): ${toApprove.length}`);
	console.log(`  -> 'pending'  (not visible, must be reviewed):    ${toPend.length}\n`);

	for (const guide of toApprove.slice(0, 10)) {
		console.log(`  approved: ${guide.guideCode ?? guide._id.toString()}`);
	}
	if (toApprove.length > 10) console.log(`  ... and ${toApprove.length - 10} more`);
	console.log('');

	if (!COMMIT) {
		console.log('DRY RUN — nothing was written. Re-run with --commit to apply.');
		return;
	}

	const [approvedResult, pendingResult] = await Promise.all([
		GuideDB.updateMany(
			{ approvalStatus: { $exists: false }, isVisible: true },
			{ $set: { approvalStatus: 'approved', approvedAt: new Date() } }
		),
		GuideDB.updateMany(
			{ approvalStatus: { $exists: false }, isVisible: { $ne: true } },
			{ $set: { approvalStatus: 'pending' } }
		),
	]);

	console.log(`Wrote 'approved' to ${approvedResult.modifiedCount} guide(s).`);
	console.log(`Wrote 'pending'  to ${pendingResult.modifiedCount} guide(s).`);
}

main()
	.catch((err) => {
		console.error('Backfill failed:', err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.connection.close();
	});
