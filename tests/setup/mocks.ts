// Mock the email provider so tests never hit the network.
//
// This used to hardcode four function names that no longer exist on the module
// (sendPasswordResetEmail, sendWelcomeEmail, …). Every real export
// (sendRegistrationOtpEmail, sendBookingAllocatedTouristEmail, …) therefore
// resolved to `undefined`, and any flow that sent mail threw "x is not a
// function". A Proxy hands back a truthy async no-op for ANY accessed export, so
// this never goes stale as templates are added. Plain functions (not jest.fn)
// are used deliberately: jest.config's `resetMocks` blanks jest mocks between
// tests, but it cannot touch a plain function. A suite that needs to *assert*
// on a specific email call still declares its own jest.mock('@provider/email'),
// which overrides this module-level default for that file.
jest.mock('@provider/email', () => {
	const sendStub = async () => true;
	return new Proxy(
		{ __esModule: true } as Record<string | symbol, unknown>,
		{ get: (target, prop) => (prop in target ? target[prop] : sendStub) }
	);
});

/**
 * Mock Cloudinary.
 *
 * Package and blog creation upload their images to Cloudinary before writing
 * anything to the database. Unmocked, those calls reach the network in tests,
 * fail, and surface as a bare 500 — which is why the whole
 * "should successfully create a package (admin)" family was red and looked like
 * an authorisation problem rather than a missing test double.
 */
// The named exports matter as much as the default now: the native Route
// Handlers upload in-memory buffers via `uploadBuffer`, and a factory that only
// stubbed `default` left them resolving to undefined — every native upload would
// die with "uploadBuffer is not a function" rather than being exercised.
jest.mock('@utils/cloudinaryUpload', () => ({
	__esModule: true,
	default: jest.fn(),
	uploadBuffer: jest.fn(),
	uploadMulterImage: jest.fn(),
}));

jest.mock('@config/cloudinary', () => ({
	__esModule: true,
	default: {
		// A plain function, not jest.fn: `config` is called at module load by the
		// real config and by suites that need credentials in place, so it has to
		// survive resetMocks like the raw-package stub below does.
		config: () => undefined,
		uploader: {
			destroy: jest.fn(),
			upload: jest.fn(),
			upload_stream: jest.fn(),
		},
		api: { resource: jest.fn() },
		url: jest.fn(() => 'https://res.cloudinary.com/test/asset.jpg'),
	},
}));

// Mock the raw `cloudinary` package too. src/config/cloudinary.ts runs
// `cloudinary.config(...)` at module load; any test that reaches the real
// package (e.g. through cloudinaryDelivery) hit "cloudinary.config is not a
// function". Plain functions here (not jest.fn) survive jest's resetMocks.
jest.mock('cloudinary', () => {
	const noop = () => undefined;
	const uploader = {
		destroy: async () => ({ result: 'ok' }),
		upload: async () => ({ secure_url: 'https://res.cloudinary.com/test/asset.jpg', public_id: 'test/asset' }),
		upload_stream: noop,
	};
	const api = { resource: async () => ({}) };
	const v2 = { config: noop, uploader, api, url: () => 'https://res.cloudinary.com/test/asset.jpg' };
	return { __esModule: true, v2, config: noop, uploader, api, default: v2 };
});

/**
 * jest.config sets `resetMocks: true`, which wipes the implementations above
 * before every test — leaving them returning `undefined` and callers blowing up
 * on `result.secure_url`. Re-installing them in beforeEach is what makes the
 * doubles survive that reset.
 *
 * Every write here is guarded by isMock(). A suite is allowed to opt out of
 * these doubles — guideIdentityDocumentView.test.ts calls jest.unmock to get
 * the real Cloudinary URL signing it asserts on — and this shared hook must not
 * then explode on the real module with "destroy.mockResolvedValue is not a
 * function", failing every test in that file.
 */
const isMock = (fn: unknown): fn is jest.Mock =>
	typeof fn === 'function' && '_isMockFunction' in fn;

beforeEach(() => {
	/* eslint-disable @typescript-eslint/no-var-requires */
	const cloudinaryUpload = require('@utils/cloudinaryUpload');
	const uploadToCloudinary = cloudinaryUpload.default;
	const cloudinary = require('@config/cloudinary').default;
	/* eslint-enable @typescript-eslint/no-var-requires */

	let counter = 0;
	if (isMock(uploadToCloudinary)) {
		uploadToCloudinary.mockImplementation(async (_buffer: Buffer, folder: string) => {
			counter += 1;
			return {
				secure_url: `https://res.cloudinary.com/test/${folder}/asset-${counter}.jpg`,
				public_id: `${folder}/asset-${counter}`,
			};
		});
	}

	// Same URLs as the default export produces, so a native handler and its
	// Express counterpart can be compared field-for-field.
	for (const name of ['uploadBuffer', 'uploadMulterImage'] as const) {
		const fn = cloudinaryUpload[name];
		if (isMock(fn)) {
			fn.mockImplementation(async (_file: unknown, folder: string) => {
				counter += 1;
				return `https://res.cloudinary.com/test/${folder}/asset-${counter}.jpg`;
			});
		}
	}

	if (isMock(cloudinary.uploader.destroy)) {
		cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
	}
	if (isMock(cloudinary.uploader.upload)) {
		cloudinary.uploader.upload.mockResolvedValue({
			secure_url: 'https://res.cloudinary.com/test/asset.jpg',
			public_id: 'test/asset',
		});
	}
});

export {};
