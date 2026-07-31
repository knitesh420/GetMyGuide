import { runWatcherTick as runTick } from '@services/notificationWatcher';

/**
 * Thin wrapper the cron Route Handler calls.
 *
 * Exists so the route imports one narrow, serverless-facing surface rather than
 * reaching into the watcher service directly, and so the timing/telemetry the
 * scheduler wants lives outside the business logic.
 */
export async function runWatcherTick(): Promise<{ durationMs: number; ranAt: string }> {
	const startedAt = Date.now();

	await runTick();

	const durationMs = Date.now() - startedAt;

	// Vercel captures stdout per invocation; this is the only record that the
	// scheduler is actually firing, so keep it.
	// eslint-disable-next-line no-console
	console.log(`watcher tick completed in ${durationMs}ms`);

	return { durationMs, ranAt: new Date(startedAt).toISOString() };
}

export default runWatcherTick;
