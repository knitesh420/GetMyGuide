import mongoose from 'mongoose';

/**
 * Serverless-safe MongoDB connection.
 *
 * The long-lived Express process connected once at boot (`connectDB` in
 * ./index.ts) and kept that pool for the process's lifetime. Serverless has no
 * boot: every cold start is a fresh module registry, and a naive `mongoose.connect()`
 * per invocation opens a new pool each time. Under any real traffic that walks
 * straight into Atlas's connection cap and the API starts returning 500s while
 * the database itself is perfectly healthy.
 *
 * The fix is the standard one: cache the connection *promise* on globalThis,
 * which survives module re-evaluation within a warm container, and await the
 * same promise on every subsequent invocation. Caching the promise rather than
 * the resolved connection matters — two requests arriving during the same cold
 * start must not each start their own connect().
 *
 * `connectDB` in ./index.ts is deliberately left alone: server.ts and the test
 * suite both depend on its exact behaviour.
 */

type ConnectionCache = {
	conn: typeof mongoose | null;
	promise: Promise<typeof mongoose> | null;
};

declare global {
	// eslint-disable-next-line no-var
	var __mongooseCache: ConnectionCache | undefined;
}

const cached: ConnectionCache = globalThis.__mongooseCache ?? { conn: null, promise: null };
globalThis.__mongooseCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
	// readyState 1 = connected. A cached connection that has since dropped must
	// not be handed out; fall through and reconnect.
	if (cached.conn && mongoose.connection.readyState === 1) {
		return cached.conn;
	}

	if (!cached.promise) {
		const url = process.env.DATABASE_URL;
		if (!url) {
			throw new Error('DATABASE_URL is not set');
		}

		// Same global settings the Express app applied at boot, so query and
		// populate behaviour is identical to production.
		mongoose.set('strictQuery', false);
		mongoose.set('strictPopulate', false);

		cached.promise = mongoose
			.connect(url, {
				// A serverless container handles one request at a time, so a large
				// pool per instance buys nothing and multiplies across instances.
				maxPoolSize: 10,
				minPoolSize: 0,
				// Fail fast rather than hold a function open until its timeout.
				serverSelectionTimeoutMS: 10_000,
				socketTimeoutMS: 45_000,
				// Don't let mongoose queue operations while disconnected; surface the
				// error instead of silently stalling the invocation.
				bufferCommands: false,
			})
			.then((m) => {
				cached.conn = m;
				return m;
			})
			.catch((err) => {
				// Clear the cached promise so the next invocation retries rather than
				// re-awaiting a permanently rejected one.
				cached.promise = null;
				throw err;
			});
	}

	cached.conn = await cached.promise;
	return cached.conn;
}

export default connectToDatabase;
