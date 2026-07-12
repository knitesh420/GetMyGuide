/**
 * Copy every field that still lives ONLY on GuideEnrollment into the Guide
 * document, so `guides` becomes self-sufficient and GuideEnrollment can be
 * retired without losing data.
 *
 * WHY THIS IS NEEDED: migrateGuideMembership.ts created the Guide rows for
 * legacy guides but only copied `languages`, `city` and `photo`. It never
 * copied `type`, `pan`, `licence` or `aadhar`. Today those are still read
 * straight off the enrollment via the fallbacks in GuideService.getGuideProfile
 * / getGuideById and in the admin panel. Deleting GuideEnrollment before this
 * runs would silently downgrade every legacy escort guide to 'normal' and
 * orphan their KYC documents.
 *
 * SAFE BY DEFAULT — dry run, writes nothing unless you pass `--commit`.
 * (The local .env points at the live production cluster.)
 *
 * Idempotent: only ever fills fields that are currently empty on the Guide. It
 * never overwrites a value the guide has since set through the new profile
 * form, so re-running it is a no-op.
 *
 * Usage:
 *   # preview + inspection report — no writes:
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/backfillGuideFromEnrollment.ts
 *
 *   # actually write (TAKE A BACKUP FIRST):
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/backfillGuideFromEnrollment.ts --commit
 */
import dotenv from 'dotenv';
dotenv.config();

import { DATABASE_URL } from '@config/const';
import connectDB, { AccountDB, GuideDB } from '@mongo';
import mongoose from 'mongoose';

/** Fields we may fill on a Guide, for the per-field tally in the report. */
const FIELDS = ['type', 'pan', 'identityProofs', 'languages', 'city', 'profileImage'] as const;
type Field = (typeof FIELDS)[number];

/**
 * The retired GuideEnrollment shape. Read through the raw driver rather than a
 * mongoose model on purpose: the model has been deleted from the app, and the
 * `guideenrollments` collection is kept only as a cold archive. This script is
 * the last thing that reads it.
 */
interface LegacyEnrollment {
	_id: mongoose.Types.ObjectId;
	name: string;
	email: string;
	phone: string;
	city: string;
	type: 'normal' | 'escort';
	pan?: string;
	licence: string;
	aadhar: string;
	languages: string[];
	photo: string;
	status: 'pending_payment' | 'completed' | 'failed';
	createdAt: Date;
}

async function main(): Promise<void> {
	const commit = process.argv.includes('--commit');
	const redactedUrl = DATABASE_URL.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@');

	console.log('');
	console.log(
		commit
			? '=== GUIDE <- ENROLLMENT BACKFILL — COMMIT MODE (writes to the database) ==='
			: '=== GUIDE <- ENROLLMENT BACKFILL — DRY RUN (no writes) ==='
	);
	console.log(`DB: ${redactedUrl}`);
	console.log('');

	await connectDB(DATABASE_URL);
	try {
		const db = mongoose.connection.db;
		if (!db) {
			throw new Error('No database handle on the mongoose connection.');
		}
		const enrollments = await db
			.collection<LegacyEnrollment>('guideenrollments')
			.find({})
			.toArray();
		const guideAccounts = await AccountDB.find({ role: 'guide' }).select('_id email').lean();
		const guides = await GuideDB.find({}).lean();

		const enrollmentByEmail = new Map(enrollments.map((e) => [e.email.toLowerCase(), e]));
		const guideByAccountId = new Map(guides.map((g) => [g.accountId.toString(), g]));

		console.log('--- Current state ---');
		console.log(`  guideenrollments documents : ${enrollments.length}`);
		console.log(`  Account(role: 'guide')     : ${guideAccounts.length}`);
		console.log(`  guides documents           : ${guides.length}`);
		console.log('');

		const filled: Record<Field, number> = {
			type: 0,
			pan: 0,
			identityProofs: 0,
			languages: 0,
			city: 0,
			profileImage: 0,
		};
		let escortRescued = 0;
		let accountsWithoutGuide = 0;
		let accountsWithoutEnrollment = 0;
		const ops: mongoose.AnyBulkWriteOperation[] = [];
		const claimedEmails = new Set<string>();

		for (const account of guideAccounts) {
			const email = account.email.toLowerCase();
			const enrollment = enrollmentByEmail.get(email);
			const guide = guideByAccountId.get(account._id.toString());

			if (!guide) {
				// Shouldn't happen post-migrateGuideMembership, but a guide account
				// with no Guide row would be invisible to the admin panel once the
				// enrollment listing is gone, so surface it loudly.
				accountsWithoutGuide++;
				console.warn(`  ! guide Account with NO Guide profile: ${email} (${account._id.toString()})`);
				continue;
			}
			if (!enrollment) {
				accountsWithoutEnrollment++;
				continue;
			}
			claimedEmails.add(email);

			// Only ever fill what is currently empty — never clobber a value the
			// guide set through the new profile form.
			const set: Record<string, unknown> = {};

			if (!guide.type && enrollment.type) {
				set.type = enrollment.type;
				filled.type++;
				if (enrollment.type === 'escort') {
					escortRescued++;
				}
			}
			if (!guide.pan && enrollment.pan) {
				set.pan = enrollment.pan;
				filled.pan++;
			}
			// Guide.identityProofs is [licence, aadhaar] in that order — the admin
			// panel indexes it positionally, so preserve the order here.
			if (!guide.identityProofs?.length && (enrollment.licence || enrollment.aadhar)) {
				set.identityProofs = [enrollment.licence, enrollment.aadhar].filter(Boolean);
				filled.identityProofs++;
			}
			if (!guide.languages?.length && enrollment.languages?.length) {
				set.languages = enrollment.languages;
				filled.languages++;
			}
			if (!guide.city && enrollment.city) {
				set.city = enrollment.city;
				filled.city++;
			}
			if (!guide.profileImage && enrollment.photo) {
				set.profileImage = enrollment.photo;
				filled.profileImage++;
			}

			if (Object.keys(set).length > 0) {
				ops.push({ updateOne: { filter: { _id: guide._id }, update: { $set: set } } });
			}
		}

		// Enrollments whose email matches no guide Account. These have nowhere to
		// be backfilled TO — dropping GuideEnrollment erases them and their KYC.
		const orphans = enrollments.filter((e) => !claimedEmails.has(e.email.toLowerCase()));

		console.log('--- Fields to fill on Guide (from enrollment) ---');
		for (const field of FIELDS) {
			console.log(`  ${field.padEnd(16)} : ${filled[field]}`);
		}
		console.log('');
		console.log(`  Guide docs to update       : ${ops.length}`);
		console.log(`  ESCORT guides rescued      : ${escortRescued}   <-- would silently become 'normal' without this`);
		console.log(`  guide Accounts w/o Guide   : ${accountsWithoutGuide}`);
		console.log(`  guide Accounts w/o enroll. : ${accountsWithoutEnrollment}  (fine — registered via the new form)`);
		console.log('');

		console.log('--- Orphan enrollments (no guide Account for that email) ---');
		if (orphans.length === 0) {
			console.log('  none — every enrollment maps to a guide Account. Safe to drop the collection.');
		} else {
			console.log(`  ${orphans.length} orphan(s). These vanish from the admin panel if GuideEnrollment goes:`);
			for (const o of orphans) {
				console.log(
					`    - ${o.email.padEnd(34)} ${String(o.type).padEnd(7)} status=${String(o.status).padEnd(15)} ${new Date(o.createdAt).toISOString().slice(0, 10)}  ${o.name}`
				);
			}
		}
		console.log('');

		if (!commit) {
			console.log('Dry run complete. No writes were made.');
			console.log('Review the numbers above, TAKE A BACKUP, then re-run with --commit.');
			return;
		}

		if (ops.length === 0) {
			console.log('Nothing to write — every Guide already carries its enrollment data.');
			return;
		}

		const BATCH = 500;
		for (let i = 0; i < ops.length; i += BATCH) {
			await GuideDB.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
		}
		console.log(`Committed. ${ops.length} Guide document(s) updated.`);
		console.log('Re-run without --commit to confirm it now reports 0 to update.');
	} finally {
		await mongoose.connection.close();
	}
}

main().catch((err) => {
	console.error('Backfill failed:', err);
	process.exit(1);
});
