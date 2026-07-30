/**
 * Lock down identity-proof assets that were uploaded to Cloudinary as PUBLIC.
 *
 * KYC proofs used to go up on the default public `upload` type. That means the
 * raw Cloudinary URL is world-readable — image proofs (jpg/png) are being served
 * to anyone with the link right now, and PDF proofs would join them the moment
 * the account's "Allow delivery of PDF and ZIP files" setting is turned on.
 *
 * This flips each existing proof's `access_mode` to `authenticated`, so it can
 * only be delivered via a signed URL (which the app now generates server-side).
 * The delivery URL is unchanged, so NOTHING in the database needs migrating —
 * this only changes the asset's access flag on Cloudinary.
 *
 * RUN THIS BEFORE enabling PDF/ZIP delivery in the Cloudinary console, so the
 * image proofs are private before that setting makes the PDFs deliverable too.
 *
 * SAFE BY DEFAULT — this is a DRY RUN and changes nothing unless you pass
 * `--commit`. The local .env points at the live production cluster and the live
 * Cloudinary account, so the default has to be the harmless one.
 *
 * Idempotent: assets already delivered as `authenticated` (every upload after
 * this change shipped) are skipped, so re-running only ever touches what is
 * still public.
 *
 * Usage:
 *   # preview only — no changes:
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/secureGuideIdentityProofs.ts
 *
 *   # actually apply (TAKE STOCK FIRST):
 *   pnpm exec ts-node -r tsconfig-paths/register src/scripts/secureGuideIdentityProofs.ts --commit
 */
import dotenv from 'dotenv';
dotenv.config();

import cloudinary from '@config/cloudinary';
import { DATABASE_URL } from '@config/const';
import connectDB, { GuideDB } from '@mongo';
import { parseCloudinaryUrl } from '@utils/cloudinaryDelivery';
import mongoose from 'mongoose';

const COMMIT = process.argv.includes('--commit');

interface Target {
	publicId: string;
	resourceType: string;
	/** The reference we found it through, for the log. */
	via: string;
}

async function main() {
	if (!DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}
	if (
		!process.env.CLOUDINARY_CLOUD_NAME ||
		!process.env.CLOUDINARY_API_KEY ||
		!process.env.CLOUDINARY_API_SECRET
	) {
		throw new Error('Cloudinary credentials are not set — cannot change asset access.');
	}

	await connectDB(DATABASE_URL);
	console.log(`Connected. Mode: ${COMMIT ? 'COMMIT (will change assets)' : 'DRY RUN (no changes)'}\n`);

	const guides = await GuideDB.find({
		$or: [
			{ identityProofs: { $exists: true, $ne: [] } },
			{ 'identityDocuments.aadhaar.url': { $exists: true } },
			{ 'identityDocuments.guideLicence.url': { $exists: true } },
		],
	})
		.select('_id guideCode identityProofs identityDocuments')
		.lean();

	// De-duplicate by public_id: the same asset can be referenced more than once,
	// and updating it twice buys nothing.
	const targets = new Map<string, Target>();
	let skippedAuthenticated = 0;
	let skippedLocal = 0;

	const consider = (rawUrl: string | undefined, via: string) => {
		if (!rawUrl) return;
		const parsed = parseCloudinaryUrl(rawUrl);
		if (!parsed) {
			// A bare legacy filename served off local disk — not a Cloudinary asset.
			skippedLocal += 1;
			return;
		}
		if (parsed.deliveryType === 'authenticated' || parsed.deliveryType === 'private') {
			// Already private — an upload made after this change shipped.
			skippedAuthenticated += 1;
			return;
		}
		if (!targets.has(parsed.publicId)) {
			targets.set(parsed.publicId, {
				publicId: parsed.publicId,
				resourceType: parsed.resourceType,
				via,
			});
		}
	};

	for (const guide of guides) {
		const ref = guide.guideCode ?? guide._id.toString();
		(guide.identityProofs ?? []).forEach((url, i) => consider(url, `${ref} identityProofs[${i}]`));
		consider(guide.identityDocuments?.aadhaar?.url, `${ref} identityDocuments.aadhaar`);
		consider(guide.identityDocuments?.guideLicence?.url, `${ref} identityDocuments.guideLicence`);
	}

	console.log(`Guides with proofs:            ${guides.length}`);
	console.log(`Public assets to lock down:    ${targets.size}`);
	console.log(`Already authenticated (skip):  ${skippedAuthenticated}`);
	console.log(`Local / non-Cloudinary (skip): ${skippedLocal}\n`);

	if (targets.size === 0) {
		console.log('Nothing to do — no public Cloudinary proofs remain.');
		return;
	}

	for (const t of [...targets.values()].slice(0, 10)) {
		console.log(`  ${t.publicId}  (${t.via})`);
	}
	if (targets.size > 10) console.log(`  ... and ${targets.size - 10} more`);
	console.log('');

	if (!COMMIT) {
		console.log('DRY RUN — nothing was changed. Re-run with --commit to apply.');
		return;
	}

	let ok = 0;
	let failed = 0;
	for (const t of targets.values()) {
		try {
			await cloudinary.api.update(t.publicId, {
				resource_type: t.resourceType,
				type: 'upload',
				access_mode: 'authenticated',
			});
			ok += 1;
		} catch (err) {
			failed += 1;
			console.error(`  FAILED ${t.publicId}:`, err instanceof Error ? err.message : err);
		}
	}

	console.log(`\nLocked down ${ok} asset(s).${failed ? ` ${failed} failed (see above).` : ''}`);
	console.log(
		'\nNext step: enable "Allow delivery of PDF and ZIP files" in the Cloudinary console\n' +
			'(Settings → Security) so PDF proofs can be delivered via their signed URLs.'
	);
}

main()
	.catch((err) => {
		console.error('Lockdown failed:', err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.connection.close();
	});
