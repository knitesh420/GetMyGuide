import { connectToDatabase } from '@/server/mongo/connection';
import { handleWithExpress } from '@/server/http/express-adapter';
import { getExpressApp } from '@/server/http/express-app';

/**
 * Catch-all API route — every /api/* request that no more specific Route
 * Handler claims is served here by the existing Express application.
 *
 * This is the hinge of the migration. Rather than hand-porting 178 endpoints in
 * one commit and hoping the payment and booking logic survived, the app that
 * runs in production today runs unchanged inside a Route Handler, and modules
 * are peeled off into native handlers one at a time behind a green test suite.
 *
 * Next matches the most specific route first, so creating app/api/session/…
 * automatically takes precedence over this file for those paths — peeling a
 * module requires no change here. When the last module is peeled, this file is
 * deleted along with Express itself.
 *
 * Rollback: delete this file and repoint NEXT_PUBLIC_API_URL at the Hostinger
 * backend. Nothing else in the app depends on it.
 */

// The Express app, mongoose, bcrypt and pdfkit are all Node APIs — this can
// never run on the Edge runtime.
export const runtime = 'nodejs';

// Every endpoint here is request-specific (auth cookies, per-user data). Static
// optimisation would be actively wrong.
export const dynamic = 'force-dynamic';

async function handler(request: Request): Promise<Response> {
	try {
		// Cached per container; a warm invocation reuses the pool rather than
		// opening a new one.
		await connectToDatabase();
	} catch (err) {
		// A failed connect must not surface as an opaque platform 500 — the shape
		// below matches what the frontend's api.ts unwrap() expects.
		// eslint-disable-next-line no-console
		console.error('Database connection failed', err);
		return Response.json(
			{ success: false, message: 'Service temporarily unavailable' },
			{ status: 503 }
		);
	}

	return handleWithExpress(getExpressApp(), request, '/api');
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
