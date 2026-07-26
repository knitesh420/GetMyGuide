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
jest.mock('@utils/cloudinaryUpload', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('@config/cloudinary', () => ({
	__esModule: true,
	default: {
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
 */
beforeEach(() => {
	/* eslint-disable @typescript-eslint/no-var-requires */
	const uploadToCloudinary = require('@utils/cloudinaryUpload').default;
	const cloudinary = require('@config/cloudinary').default;
	/* eslint-enable @typescript-eslint/no-var-requires */

	let counter = 0;
	uploadToCloudinary.mockImplementation(async (_buffer: Buffer, folder: string) => {
		counter += 1;
		return {
			secure_url: `https://res.cloudinary.com/test/${folder}/asset-${counter}.jpg`,
			public_id: `${folder}/asset-${counter}`,
		};
	});

	cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
	cloudinary.uploader.upload.mockResolvedValue({
		secure_url: 'https://res.cloudinary.com/test/asset.jpg',
		public_id: 'test/asset',
	});
});

export {};
