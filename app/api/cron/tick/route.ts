import { connectToDatabase } from '@/server/mongo/connection';
import { runWatcherTick } from '@/server/http/watcher-tick';

/**
 * Serverless replacement for the notification watcher's setInterval loop.
 *
 * `startNotificationWatcher()` ran every 5 minutes inside the long-lived Express
 * process. Serverless has no such process, so the same work is exposed as an
 * endpoint and driven by an external scheduler (cron-job.org, GitHub Actions, or
 * Vercel Cron on a paid plan) hitting it on the same 5-minute cadence.
 *
 * This is not optional bookkeeping. `reconcileOrphanedBookingPayments()` is what
 * turns a captured payment into a Booking when the webhook's fulfilment threw or
 * the customer's browser never came back. Without it a customer can pay and
 * receive nothing. If you take one thing from this file: the scheduler must
 * actually be configured, and it must be monitored.
 *
 * The tick is idempotent — notification dedup is enforced by Notification's
 * unique dedupeKey index, and the fulfil* methods no-op once a booking exists —
 * so overlapping or repeated calls are safe.
 *
 * Setup:
 *   POST https://<host>/api/cron/tick
 *   Header: Authorization: Bearer $CRON_SECRET
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Reconciliation touches several collections; give it room but stay under the
// Hobby ceiling. Raise on Pro if the orphan backlog ever grows.
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
	const secret = process.env.CRON_SECRET;

	// Fail closed. An unset secret must not mean "open to the internet" — this
	// endpoint moves money-adjacent state.
	if (!secret || secret === 'change-me-to-a-long-random-string') return false;

	const header = request.headers.get('authorization');
	if (header === `Bearer ${secret}`) return true;

	// Vercel Cron sends its own header rather than one we control.
	return request.headers.get('x-vercel-cron-signature') !== null && process.env.VERCEL === '1';
}

async function handler(request: Request): Promise<Response> {
	if (!isAuthorized(request)) {
		return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	try {
		await connectToDatabase();
		const result = await runWatcherTick();
		return Response.json({ success: true, ...result });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('cron tick failed', err);
		return Response.json({ success: false, message: 'Tick failed' }, { status: 500 });
	}
}

export const POST = handler;
// GET is accepted because several free schedulers only issue GETs.
export const GET = handler;
