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
		getAllGuidesForAdmin: jest.fn(),
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

	describe('getAllGuidesForAdmin', () => {
		it('returns the guide listing wrapped under `data`', async () => {
			const mockRequest = createMockRequest({
				locals: { user: createMockUser({ role: 'admin' }) },
			}) as any;
			const mockResponse = createMockResponse();
			const mockNext = createMockNext();

			const mockGuides = [
				{ accountId: '123', name: 'Guide 1', email: 'guide1@example.com', type: 'normal' },
				{ accountId: '456', name: 'Guide 2', email: 'guide2@example.com', type: 'escort' },
			];
			(GuideService.getAllGuidesForAdmin as jest.Mock).mockResolvedValue(mockGuides);

			await Controller.getAllGuidesForAdmin(mockRequest, mockResponse as any, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(GuideService.getAllGuidesForAdmin).toHaveBeenCalled();
			// Respond() spreads `data` onto the body root, so the array must stay
			// wrapped or it would splat into numeric keys.
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({ data: mockGuides })
			);
		});
	});
});
