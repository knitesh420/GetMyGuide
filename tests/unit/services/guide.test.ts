import { AccountDB, GuideDB } from '@mongo';
import GuideService from '@services/guide';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

// Mock TransactionService
jest.mock('@services/transaction', () => ({
	__esModule: true,
	default: {
		createTransaction: jest.fn(),
		getTransactionStatus: jest.fn(),
		getTransaction: jest.fn(),
		getTransactionByReference: jest.fn(),
	},
}));

const DAY = 24 * 60 * 60 * 1000;

async function createGuide(overrides: {
	name: string;
	email: string;
	type?: 'normal' | 'escort';
	membershipExpiryDate?: Date | null;
	isVisible?: boolean;
}) {
	const account = await AccountDB.create({
		name: overrides.name,
		email: overrides.email,
		phone: '+1234567890',
		password: 'Password@123',
		role: 'guide',
		status: 'verified',
	});

	const guide = await GuideDB.create({
		accountId: account._id,
		languages: ['English'],
		city: 'Delhi',
		type: overrides.type,
		profileImage: 'photo.jpg',
		identityProofs: ['licence.pdf', 'aadhar.pdf'],
		registrationCompleted: true,
		paymentStatus: 'success',
		isVisible: overrides.isVisible ?? true,
		membershipExpiryDate:
			overrides.membershipExpiryDate === undefined
				? new Date(Date.now() + 30 * DAY)
				: overrides.membershipExpiryDate,
	});

	return { account, guide };
}

describe('Guide Service', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
		jest.clearAllMocks();
	});

	describe('getAllGuidesForAdmin', () => {
		it('returns every guide account joined with its Guide profile', async () => {
			await createGuide({ name: 'Guide 1', email: 'guide1@example.com', type: 'normal' });
			await createGuide({ name: 'Guide 2', email: 'guide2@example.com', type: 'escort' });

			const guides = await GuideService.getAllGuidesForAdmin();

			expect(guides).toHaveLength(2);
			const byEmail = new Map(guides.map((g) => [g.email, g]));

			const escort = byEmail.get('guide2@example.com')!;
			expect(escort.type).toBe('escort');
			expect(escort.city).toBe('Delhi');
			expect(escort.membershipActive).toBe(true);
			// [licence, aadhaar] in upload order — the admin panel indexes positionally.
			expect(escort.identityProofs).toEqual(['licence.pdf', 'aadhar.pdf']);
			expect(escort.guideCode).toMatch(/^GU\d{6}$/);
		});

		it('reports an expired membership as inactive', async () => {
			await createGuide({
				name: 'Lapsed',
				email: 'lapsed@example.com',
				membershipExpiryDate: new Date(Date.now() - DAY),
			});

			const [guide] = await GuideService.getAllGuidesForAdmin();

			expect(guide.membershipActive).toBe(false);
		});
	});

	describe('getGuideProfile', () => {
		it('reads type and KYC straight off the Guide profile', async () => {
			const { account } = await createGuide({
				name: 'Escort Guide',
				email: 'escort@example.com',
				type: 'escort',
			});

			const profile = await GuideService.getGuideProfile(account._id.toString());

			expect(profile.type).toBe('escort');
			expect(profile.isCertified).toBe(true);
			expect(profile.identityProofs).toEqual(['licence.pdf', 'aadhar.pdf']);
		});

		it('defaults an untyped guide to normal rather than certifying them', async () => {
			const { account } = await createGuide({ name: 'No Type', email: 'notype@example.com' });

			const profile = await GuideService.getGuideProfile(account._id.toString());

			expect(profile.type).toBe('normal');
			expect(profile.isCertified).toBe(false);
		});
	});

	describe('getAllApprovedGuides', () => {
		it('lists only guides with an active membership, and certifies escorts', async () => {
			await createGuide({ name: 'Visible', email: 'visible@example.com', type: 'escort' });
			await createGuide({
				name: 'Lapsed',
				email: 'lapsed@example.com',
				membershipExpiryDate: new Date(Date.now() - DAY),
			});

			const result = await GuideService.getAllApprovedGuides();

			expect(result.total).toBe(1);
			expect(result.data).toHaveLength(1);
			const [guide] = result.data as Array<{ email: string; isCertified: boolean }>;
			expect(guide.email).toBe('visible@example.com');
			expect(guide.isCertified).toBe(true);
		});
	});
});
