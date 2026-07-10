import Controller from '../../../../src/modules/guide/guide.controller';
import {
	createMockNext,
	createMockRequest,
	createMockResponse,
	createMockUser,
} from '../../../helpers/testHelpers';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../../setup/db.setup';

// Mock GuideService
jest.mock('@services/guide', () => ({
	__esModule: true,
	default: {
		getAllEnrollments: jest.fn(),
	},
}));

import GuideService from '@services/guide';

describe('Guide Controller', () => {
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

	describe('listAll', () => {
		it('should return all enrollments', async () => {
			const mockUser = createMockUser({ role: 'admin' });
			const mockRequest = createMockRequest({
				locals: {
					user: mockUser,
				},
			}) as any;

			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			const mockEnrollments = [
				{
					id: '123',
					name: 'Guide 1',
					email: 'guide1@example.com',
					status: 'unverified',
				},
				{
					id: '456',
					name: 'Guide 2',
					email: 'guide2@example.com',
					status: 'payment-pending',
				},
			];

			(GuideService.getAllEnrollments as jest.Mock).mockResolvedValue(mockEnrollments);

			await Controller.listAll(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(GuideService.getAllEnrollments).toHaveBeenCalled();
		});
	});

});
