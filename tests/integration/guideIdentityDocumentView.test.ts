// tests/setup/mocks.ts replaces `cloudinary` and `@config/cloudinary` with
// stubs for every other suite. This one must not get them: it asserts that the
// route builds a *signed* Admin-API download URL, which only the real SDK can
// produce — and the stub has no `config()` at all, so the beforeAll below died
// with "cloudinary.config is not a function".
jest.unmock('cloudinary');
jest.unmock('@config/cloudinary');

import cloudinary from '@config/cloudinary';
import { AccountDB, GuideDB } from '@mongo';
import AuthService from '@services/auth';
import axios from 'axios';
import express from 'express';
import { Readable } from 'stream';
import request from 'supertest';
import configServer from '../../src/server-config';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

jest.mock('@provider/email', () => ({
	sendGuidePaymentConfirmationEmail: jest.fn().mockResolvedValue(true),
	sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

// The route streams from Cloudinary; keep the test offline.
jest.mock('axios');

const CLOUDINARY_URL =
	'https://res.cloudinary.com/dmpz3k4mb/image/upload/v1784403764/getmyguide/guides/identity-proofs/abc123.pdf';

const GUIDE = { name: 'Doc Guide', email: 'docguide@example.com', phone: '9999999999', password: 'password123' };
const OTHER = { name: 'Other Guide', email: 'other@example.com', phone: '9999999998', password: 'password123' };

/** A guide account with `identityDocuments.aadhaar` already uploaded. */
async function seedGuide(creds: typeof GUIDE, withDocument = true) {
	await AuthService.signup(creds);
	await AccountDB.updateOne(
		{ email: creds.email },
		{ $set: { role: 'guide', emailVerified: true, status: 'verified' } }
	);
	const login = await AuthService.login({ email: creds.email, password: creds.password });
	const account = await AccountDB.findOne({ email: creds.email });

	await GuideDB.create({
		accountId: account!._id,
		registrationCompleted: true,
		languages: ['English'],
		type: 'normal',
		city: 'Jaipur',
		...(withDocument
			? {
					identityDocuments: {
						aadhaar: {
							url: CLOUDINARY_URL,
							storage: 'remote',
							mimeType: 'application/pdf',
							originalName: 'aadhaar.pdf',
							size: 1024,
							uploadedAt: new Date(),
						},
					},
				}
			: {}),
	});

	return { token: login.accessToken, accountId: account!._id.toString() };
}

describe('Guide identity document streaming', () => {
	let app: express.Application;
	let token: string;

	beforeAll(async () => {
		await connectTestDB();
		// The test env carries no Cloudinary credentials, and signing a download
		// URL needs one — without this the util degrades to a CDN URL and the
		// assertions below would pass over the code path they exist to cover.
		cloudinary.config({
			cloud_name: 'test-cloud',
			api_key: '000000000000000',
			api_secret: 'test-secret',
		});
		app = express();
		configServer(app as express.Express);
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		({ token } = await seedGuide(GUIDE));
	});

	/** Cloudinary answering with PDF bytes. */
	const mockUpstream = () =>
		(axios.get as jest.Mock).mockResolvedValue({
			status: 200,
			headers: { 'content-type': 'application/pdf', 'content-length': '9' },
			data: Readable.from([Buffer.from('%PDF-1.4\n')]),
		});

	it('exposes the document as an API path, never a Cloudinary URL', async () => {
		const res = await request(app)
			.get('/guides/profile')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const aadhaar = res.body.identityDocuments.aadhaar;
		expect(aadhaar.url).toBe('/guides/profile/documents/aadhaar/view');
		expect(aadhaar.downloadUrl).toBe('/guides/profile/documents/aadhaar/view?download=1');
		// The whole point: the stored Cloudinary URL must not reach the client.
		expect(JSON.stringify(res.body)).not.toContain('res.cloudinary.com');
	});

	it('streams the document back to the guide who owns it', async () => {
		mockUpstream();

		const res = await request(app)
			.get('/guides/profile/documents/aadhaar/view')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		expect(res.headers['content-type']).toContain('application/pdf');
		expect(res.headers['content-disposition']).toContain('inline');
		expect(res.headers['cache-control']).toBe('private, no-store');
		expect(res.body.toString()).toBe('%PDF-1.4\n');
	});

	it('fetches through the download endpoint, not the CDN', async () => {
		mockUpstream();

		await request(app)
			.get('/guides/profile/documents/aadhaar/view')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		// A signed CDN URL 401s for PDFs while the account's PDF delivery setting
		// is off, so this route must go to the Admin API download endpoint.
		const [url] = (axios.get as jest.Mock).mock.calls[0];
		expect(url).toContain('api.cloudinary.com');
		expect(url).toContain('/image/download');
		expect(url).toContain('signature=');
		expect(url).not.toContain('res.cloudinary.com');
	});

	it('honours ?download=1 with an attachment disposition', async () => {
		mockUpstream();

		const res = await request(app)
			.get('/guides/profile/documents/aadhaar/view?download=1')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		expect(res.headers['content-disposition']).toContain('attachment');
	});

	it('404s when the slot is empty', async () => {
		await clearDatabase();
		({ token } = await seedGuide(GUIDE, false));

		await request(app)
			.get('/guides/profile/documents/aadhaar/view')
			.set('Authorization', `Bearer ${token}`)
			.expect(404);
	});

	it('rejects an unknown document type', async () => {
		await request(app)
			.get('/guides/profile/documents/passport/view')
			.set('Authorization', `Bearer ${token}`)
			.expect(400);
	});

	it('requires a session', async () => {
		await request(app).get('/guides/profile/documents/aadhaar/view').expect(401);
	});

	it('serves each guide only their own document', async () => {
		mockUpstream();
		const other = await seedGuide(OTHER, false);

		// The route takes no id — it resolves the caller — so a guide with no
		// document of their own cannot reach someone else's by any parameter.
		await request(app)
			.get('/guides/profile/documents/aadhaar/view')
			.set('Authorization', `Bearer ${other.token}`)
			.expect(404);
	});
});
