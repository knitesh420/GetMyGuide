// Mock email provider to prevent actual email sends
jest.mock('@provider/email', () => ({
	sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
	sendWelcomeEmail: jest.fn().mockResolvedValue(true),
	sendGuideCredentialsEmail: jest.fn().mockResolvedValue(true),
	sendPaymentLinkEmail: jest.fn().mockResolvedValue(true),
}));

export {};
