import { AccountDB, GuideDB } from '@mongo';
import AuthService from '@services/auth';
import { uploadMulterImage } from '@utils/cloudinaryUpload';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import configServer from '../../server/server-config';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

jest.mock('@provider/email', () => ({
	sendGuidePaymentConfirmationEmail: jest.fn().mockResolvedValue(true),
	sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

// Registration uploads the profile photo to Cloudinary; keep the test offline.
jest.mock('@utils/cloudinaryUpload', () => ({
	__esModule: true,
	uploadMulterImage: jest.fn().mockResolvedValue('https://cdn.example.com/photo.jpg'),
	default: jest.fn().mockResolvedValue('https://cdn.example.com/photo.jpg'),
}));

const GUIDE = {
	name: 'Test Guide',
	email: 'guide@example.com',
	phone: '9999999999',
	password: 'password123',
};

describe('Guide profile: one-time registration, then limited edits', () => {
	let app: express.Application;
	let token: string;
	let accountId: string;

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	/** Signs up, promotes the account to a verified `guide`, and returns its token. */
	beforeEach(async () => {
		await clearDatabase();
		// jest.config sets `resetMocks: true`, which strips the implementation set
		// at mock-declaration time, so re-arm it for every test.
		(uploadMulterImage as jest.Mock).mockResolvedValue('https://cdn.example.com/photo.jpg');
		await AuthService.signup(GUIDE);
		await AccountDB.updateOne(
			{ email: GUIDE.email },
			{ $set: { role: 'guide', emailVerified: true, status: 'verified' } }
		);
		const login = await AuthService.login({ email: GUIDE.email, password: GUIDE.password });
		token = login.accessToken;
		const account = await AccountDB.findOne({ email: GUIDE.email });
		accountId = account!._id.toString();
	});

	const auth = () =>
		request(app).patch('/guides/profile').set('Authorization', `Bearer ${token}`);

	/** Puts the guide in the post-registration state the PATCH route requires. */
	const registerGuide = () =>
		GuideDB.create({
			accountId,
			registrationCompleted: true,
			languages: ['English'],
			type: 'normal',
			city: 'Delhi',
			profileImage: 'https://example.com/photo.jpg',
			identityProofs: ['proof.pdf'],
		});

	describe('PUT /guides/profile (registration)', () => {
		const imageBuffer = () =>
			Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
				'base64'
			);

		const registrationRequest = () =>
			request(app)
				.put('/guides/profile')
				.set('Authorization', `Bearer ${token}`)
				.field('phone', '7777777777')
				.field('type', 'escort')
				.field('pan', 'ABCDE1234F')
				.field('city', 'Delhi')
				.field('languages[]', 'English')
				.attach('profileImage', imageBuffer(), 'photo.jpg')
				.attach('identityProofs', imageBuffer(), 'proof.jpg');

		it('registers the guide, storing type on Guide and phone on Account', async () => {
			const res = await registrationRequest();

			expect(res.status).toBe(200);

			const guide = await GuideDB.findOne({ accountId });
			const account = await AccountDB.findById(accountId);

			expect(guide!.registrationCompleted).toBe(true);
			expect(guide!.type).toBe('escort');
			expect(guide!.city).toBe('Delhi');
			expect(account!.phone).toBe('7777777777');
			// `phone` is not a Guide path and must not have leaked onto the document.
			expect((guide!.toObject() as unknown as Record<string, unknown>).phone).toBeUndefined();
		});

		it('unlocks the PATCH route that was rejected before registering', async () => {
			await auth().send({ city: 'Agra' }).expect(400);

			await registrationRequest().expect(200);

			await auth().send({ city: 'Agra' }).expect(200);
			expect(await GuideDB.findOne({ accountId }).then((g) => g!.city)).toBe('Agra');
		});

		it('requires the guide type', async () => {
			const res = await request(app)
				.put('/guides/profile')
				.set('Authorization', `Bearer ${token}`)
				.field('phone', '7777777777')
				.field('city', 'Delhi')
				.field('languages[]', 'English')
				.attach('profileImage', imageBuffer(), 'photo.jpg')
				.attach('identityProofs', imageBuffer(), 'proof.jpg');

			expect(res.status).toBe(400);
			expect(res.body.message).toMatch(/type/i);
			expect(await GuideDB.findOne({ accountId })).toBeNull();
		});

		it('requires a PAN from escort guides but not from normal guides', async () => {
			const escortWithoutPan = await request(app)
				.put('/guides/profile')
				.set('Authorization', `Bearer ${token}`)
				.field('phone', '7777777777')
				.field('type', 'escort')
				.field('city', 'Delhi')
				.field('languages[]', 'English')
				.attach('profileImage', imageBuffer(), 'photo.jpg')
				.attach('identityProofs', imageBuffer(), 'proof.jpg');

			expect(escortWithoutPan.status).toBe(400);
			expect(escortWithoutPan.body.message).toMatch(/pan/i);
			expect(await GuideDB.findOne({ accountId })).toBeNull();

			const normalWithoutPan = await request(app)
				.put('/guides/profile')
				.set('Authorization', `Bearer ${token}`)
				.field('phone', '7777777777')
				.field('type', 'normal')
				.field('city', 'Delhi')
				.field('languages[]', 'English')
				.attach('profileImage', imageBuffer(), 'photo.jpg')
				.attach('identityProofs', imageBuffer(), 'proof.jpg');

			expect(normalWithoutPan.status).toBe(200);
			expect(await GuideDB.findOne({ accountId }).then((g) => g!.pan)).toBeUndefined();
		});
	});

	describe('gating on registration', () => {
		it('rejects a guide with no Guide record at all', async () => {
			const res = await auth().send({ city: 'Agra' });

			expect(res.status).toBe(400);
			expect(res.body.message).toMatch(/complete your guide registration/i);
		});

		it('rejects a guide whose registration is incomplete', async () => {
			await GuideDB.create({ accountId, registrationCompleted: false });

			const res = await auth().send({ city: 'Agra' });

			expect(res.status).toBe(400);
			expect(await GuideDB.findOne({ accountId }).then((g) => g!.city)).toBe('');
		});

		it('rejects an unauthenticated request', async () => {
			const res = await request(app).patch('/guides/profile').send({ city: 'Agra' });
			expect(res.status).toBe(401);
		});
	});

	describe('legacy guides (Guide record predates the `type` field)', () => {
		/** Writes a Guide doc with no `type` key at all, as production rows have.
		 *  scripts/backfillGuideFromEnrollment.ts is what fills these in. */
		const createLegacyGuideRecord = async () => {
			await registerGuide();
			await GuideDB.collection.updateOne(
				{ accountId: new mongoose.Types.ObjectId(accountId) },
				{ $unset: { type: '' } }
			);
		};

		it('does not invent a type when the stored document has none', async () => {
			await createLegacyGuideRecord();

			const guide = await GuideDB.findOne({ accountId });
			// No schema `default` — an un-backfilled row must stay distinguishable
			// from one that genuinely chose 'normal'.
			expect(guide!.type).toBeUndefined();
		});

		it('reads an untyped guide as normal, and does not certify them', async () => {
			await createLegacyGuideRecord();

			const res = await request(app)
				.get('/guides/profile')
				.set('Authorization', `Bearer ${token}`);

			expect(res.body.type).toBe('normal');
			expect(res.body.isCertified).toBe(false);
		});

		it('certifies an escort once the type is on the Guide record', async () => {
			await createLegacyGuideRecord();
			// What the backfill script writes.
			await GuideDB.updateOne({ accountId }, { $set: { type: 'escort' } });

			const res = await request(app)
				.get('/guides/profile')
				.set('Authorization', `Bearer ${token}`);

			expect(res.body.type).toBe('escort');
			expect(res.body.isCertified).toBe(true);
		});
	});

	describe('after registration', () => {
		beforeEach(registerGuide);

		it('updates all four mutable fields', async () => {
			const res = await auth().send({
				phone: '8888888888',
				city: 'Agra',
				type: 'escort',
				languages: ['Hindi', 'French'],
			});

			expect(res.status).toBe(200);

			const guide = await GuideDB.findOne({ accountId });
			const account = await AccountDB.findById(accountId);

			expect(guide!.city).toBe('Agra');
			expect(guide!.type).toBe('escort');
			expect(guide!.languages).toEqual(['Hindi', 'French']);
			expect(account!.phone).toBe('8888888888');
		});

		it('is partial — an omitted field is left alone', async () => {
			const res = await auth().send({ city: 'Jaipur' });

			expect(res.status).toBe(200);

			const guide = await GuideDB.findOne({ accountId });
			const account = await AccountDB.findById(accountId);

			expect(guide!.city).toBe('Jaipur');
			// Untouched by this request
			expect(guide!.type).toBe('normal');
			expect(guide!.languages).toEqual(['English']);
			expect(account!.phone).toBe(GUIDE.phone);
		});

		it('never lets an unknown field through', async () => {
			const res = await auth().send({ city: 'Agra', price: 999999, experience: '99 years' });

			expect(res.status).toBe(400);

			const guide = await GuideDB.findOne({ accountId });
			// Neither key exists on the schema any more, so nothing was persisted.
			expect(guide!.get('price')).toBeUndefined();
			expect(guide!.get('experience')).toBeUndefined();
			// The whole request was rejected, so the legal field did not apply either.
			expect(guide!.city).toBe('Delhi');
		});

		it('cannot re-flip registrationCompleted or membership state', async () => {
			const res = await auth().send({ registrationCompleted: false, isVisible: true });

			expect(res.status).toBe(400);

			const guide = await GuideDB.findOne({ accountId });
			expect(guide!.registrationCompleted).toBe(true);
			expect(guide!.isVisible).toBe(false);
		});

		it('rejects a malformed phone number', async () => {
			const res = await auth().send({ phone: '123' });

			expect(res.status).toBe(400);
			expect(res.body.message).toMatch(/10 digits/i);
			expect(await AccountDB.findById(accountId).then((a) => a!.phone)).toBe(GUIDE.phone);
		});

		it('rejects an unknown guide type', async () => {
			const res = await auth().send({ type: 'superstar' });

			expect(res.status).toBe(400);
			expect(await GuideDB.findOne({ accountId }).then((g) => g!.type)).toBe('normal');
		});

		it('rejects an empty body', async () => {
			const res = await auth().send({});

			expect(res.status).toBe(400);
			expect(res.body.message).toMatch(/at least one of/i);
		});

		it('rejects an empty languages array', async () => {
			const res = await auth().send({ languages: [] });

			expect(res.status).toBe(400);
			expect(await GuideDB.findOne({ accountId }).then((g) => g!.languages)).toEqual([
				'English',
			]);
		});

		it('reports the new type through isCertified', async () => {
			await auth().send({ type: 'escort' }).expect(200);

			const res = await request(app)
				.get('/guides/profile')
				.set('Authorization', `Bearer ${token}`);

			expect(res.body.type).toBe('escort');
			expect(res.body.isCertified).toBe(true);
		});
	});
});
