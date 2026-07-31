import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Multipart uploads through the Next.js adapter.
 *
 * This exists because uploads are the one path that does NOT go through the
 * JSON body parser, and the existing upload suites all drive Express directly
 * via supertest — so nothing covered multipart across the Web-Request
 * translation. When first written, this test failed: the serverless app skips
 * server-config.ts's createDir(), so multer's diskStorage target did not exist
 * and every upload returned 500 "File upload failed". On Vercel that would have
 * been every profile photo, KYC document, blog image and advertisement video.
 *
 * Cloudinary is stubbed — the assertion is about the request reaching multer
 * with an intact file, not about the upload provider.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

/** Smallest valid PNG (1x1, transparent). */
const PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('multipart uploads through the adapter', () => {
	// This suite spins up mongodb-memory-server AND does real disk I/O through
	// multer, so under parallel load it can exceed the global 30s timeout on a
	// cold binary cache — it flaked exactly once that way. The work is genuinely
	// slow rather than stuck, so give it room instead of leaving a flaky test in
	// the suite.
	jest.setTimeout(120_000);

	beforeAll(async () => {
		process.env.DATABASE_URL = await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	async function upload(token: string, filename: string, type: string) {
		const { POST } = await import('@/app/api/[...path]/route');

		const bytes = Buffer.from(PNG_BASE64, 'base64');
		const form = new FormData();
		form.append('file', new Blob([new Uint8Array(bytes)], { type }), filename);

		return POST(
			new Request('http://localhost/api/upload-media', {
				method: 'POST',
				headers: { authorization: `Bearer ${token}` },
				body: form,
			})
		);
	}

	it('accepts an image and returns the stored filename', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const res = await upload(token, 'test.png', 'image/png');

		expect(res.status).toBe(200);

		const body = (await res.json()) as { success?: boolean; name?: string };
		expect(body.success).toBe(true);
		// multer names the stored file with a uuid and keeps the extension.
		expect(body.name).toMatch(/\.png$/);
	});

	it('rejects an unauthenticated upload', async () => {
		const { POST } = await import('@/app/api/[...path]/route');

		const bytes = Buffer.from(PNG_BASE64, 'base64');
		const form = new FormData();
		form.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'test.png');

		const res = await POST(
			new Request('http://localhost/api/upload-media', { method: 'POST', body: form })
		);

		expect(res.status).toBe(401);
	});

	it('rejects a non-media file type', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		// The route's ONLY_MEDIA_ALLOWED filter must still apply through the
		// adapter — this is the guard that stops an SVG or script being stored.
		const res = await upload(token, 'payload.svg', 'image/svg+xml');

		expect(res.status).toBeGreaterThanOrEqual(400);
	});
});
