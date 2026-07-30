/**
 * Backfill human-facing business codes (TO/GU/BK/TR/AS/PM) onto the documents
 * that predate the code fields, so every Tourist/Guide/Booking/Trip/Assignment/
 * Transaction has a stable public identifier.
 *
 * SAFE BY DEFAULT — this runs as a DRY RUN and writes nothing unless you pass
 * `--commit`. (This is the opposite default of migrateGuideMembership.ts, on
 * purpose: the local .env points at the live production cluster.)
 *
 * Idempotent: only ever touches documents that still lack a code, and computes
 * the starting sequence from the highest code already in use (plus the Counter),
 * so it can never collide with codes the schema hooks have already minted for
 * documents created after deploy. Oldest documents (by createdAt) get the
 * lowest numbers.
 *
 * Usage:
 *   # preview only — no writes:
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/backfillBusinessCodes.ts
 *
 *   # actually write (TAKE A BACKUP FIRST):
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/backfillBusinessCodes.ts --commit
 */
import dotenv from 'dotenv';
dotenv.config();

import { DATABASE_URL } from '@config/const';
import connectDB, {
	AssignmentDB,
	BookingDB,
	CounterDB,
	GuideDB,
	TouristDB,
	TransactionDB,
	TripDB,
} from '@mongo';
import mongoose from 'mongoose';

interface Target {
	label: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	model: mongoose.Model<any>;
	field: string;
	prefix: string;
	counterId: string;
}

const TARGETS: Target[] = [
	{ label: 'Tourist', model: TouristDB, field: 'touristCode', prefix: 'TO', counterId: 'tourist' },
	{ label: 'Guide', model: GuideDB, field: 'guideCode', prefix: 'GU', counterId: 'guide' },
	{ label: 'Booking', model: BookingDB, field: 'bookingCode', prefix: 'BK', counterId: 'booking' },
	{ label: 'Trip', model: TripDB, field: 'tripCode', prefix: 'TR', counterId: 'trip' },
	{ label: 'Assignment', model: AssignmentDB, field: 'assignmentCode', prefix: 'AS', counterId: 'assignment' },
	{ label: 'Transaction', model: TransactionDB, field: 'paymentCode', prefix: 'PM', counterId: 'payment' },
];

function code(prefix: string, seq: number): string {
	return prefix + seq.toString().padStart(6, '0');
}

async function backfill(target: Target, commit: boolean): Promise<void> {
	const { label, model, field, prefix, counterId } = target;
	const pad = label.padEnd(12);

	// Highest sequence already in use for this prefix — from documents that
	// already carry a code (e.g. minted by the schema hooks post-deploy) and
	// from the Counter itself. New codes start strictly above this.
	const coded = await model.find({ [field]: { $exists: true, $ne: null } }).select(field).lean();
	let maxSeq = 0;
	for (const doc of coded) {
		const value = (doc as Record<string, unknown>)[field];
		if (typeof value === 'string' && value.startsWith(prefix)) {
			const n = parseInt(value.slice(prefix.length), 10);
			if (!Number.isNaN(n) && n > maxSeq) {
				maxSeq = n;
			}
		}
	}
	const counter = await CounterDB.findById(counterId).lean();
	if (counter && counter.seq > maxSeq) {
		maxSeq = counter.seq;
	}

	// Documents still missing a code, oldest first.
	const missing = await model
		.find({ $or: [{ [field]: { $exists: false } }, { [field]: null }] })
		.select('_id')
		.sort({ createdAt: 1, _id: 1 })
		.lean();

	if (missing.length === 0) {
		console.log(`  ${pad} up to date (${coded.length} already coded).`);
		return;
	}

	const firstSeq = maxSeq + 1;
	const lastSeq = maxSeq + missing.length;
	console.log(
		`  ${pad} ${missing.length} to backfill -> ${code(prefix, firstSeq)} .. ${code(prefix, lastSeq)}`
	);

	if (!commit) {
		return;
	}

	const ops = missing.map((doc, i) => ({
		updateOne: {
			filter: { _id: (doc as { _id: mongoose.Types.ObjectId })._id },
			update: { $set: { [field]: code(prefix, firstSeq + i) } },
		},
	}));
	const BATCH = 1000;
	for (let i = 0; i < ops.length; i += BATCH) {
		await model.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
	}
	// Advance the counter so future hook-minted codes never reuse a number.
	await CounterDB.findByIdAndUpdate(counterId, { $max: { seq: lastSeq } }, { upsert: true });
	console.log(`  ${pad} committed; counter '${counterId}' >= ${lastSeq}.`);
}

async function main(): Promise<void> {
	const commit = process.argv.includes('--commit');
	const redactedUrl = DATABASE_URL.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@');

	console.log('');
	console.log(
		commit
			? '=== BUSINESS-CODE BACKFILL — COMMIT MODE (writes to the database) ==='
			: '=== BUSINESS-CODE BACKFILL — DRY RUN (no writes) ==='
	);
	console.log(`DB: ${redactedUrl}`);
	console.log('');

	await connectDB(DATABASE_URL);
	try {
		for (const target of TARGETS) {
			await backfill(target, commit);
		}
	} finally {
		await mongoose.connection.close();
	}

	console.log('');
	console.log(
		commit
			? 'Backfill complete. Codes written and counters advanced.'
			: 'Dry run complete. Review the ranges above, take a backup, then re-run with --commit.'
	);
}

main().catch((err) => {
	console.error('Backfill failed:', err);
	process.exit(1);
});
