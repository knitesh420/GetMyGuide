// Mock email provider to prevent actual email sends
jest.mock('@provider/email', () => ({
	sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
	sendWelcomeEmail: jest.fn().mockResolvedValue(true),
	sendGuideCredentialsEmail: jest.fn().mockResolvedValue(true),
	sendPaymentLinkEmail: jest.fn().mockResolvedValue(true),
}));

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
	},
}));

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
