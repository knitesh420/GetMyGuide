import { GuideEnrollmentDB } from '@mongo';
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

import TransactionService from '@services/transaction';

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
		(TransactionService.createTransaction as jest.Mock).mockClear();
		(TransactionService.getTransactionStatus as jest.Mock).mockClear();
		(TransactionService.getTransaction as jest.Mock).mockClear();
		(TransactionService.getTransactionByReference as jest.Mock).mockClear();
	});

	describe('getAllEnrollments', () => {
		it('should return all enrollments sorted by creation date', async () => {
			await GuideEnrollmentDB.create({
				name: 'Guide 1',
				email: 'guide1@example.com',
				phone: '+1234567891',
				city: 'Delhi',
				type: 'normal',
				pan: 'PAN001',
				licence: 'lic1.pdf',
				aadhar: 'aad1.pdf',
				languages: ['English'],
				photo: 'photo1.jpg',
			});

			await GuideEnrollmentDB.create({
				name: 'Guide 2',
				email: 'guide2@example.com',
				phone: '+1234567892',
				city: 'Bangalore',
				type: 'escort',
				pan: 'PAN002',
				licence: 'lic2.pdf',
				aadhar: 'aad2.pdf',
				languages: ['English', 'Kannada'],
				photo: 'photo2.jpg',
			});

			(TransactionService.getTransactionByReference as jest.Mock).mockRejectedValue(
				new Error('Not found')
			);

			const enrollments = await GuideService.getAllEnrollments();

			expect(enrollments).toHaveLength(2);
			expect(enrollments[0].email).toBe('guide2@example.com'); // Newest first
			expect(enrollments[1].email).toBe('guide1@example.com');
		});
	});

});
