import { AccountDB } from '@mongo';
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../setup/db.setup';
import { testUser, testAdmin } from '../../helpers/fixtures';

describe('Account Model', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	describe('Schema and Validation', () => {
		it('should create a user with required fields', async () => {
			const user = await AccountDB.create(testUser);

			expect(user._id).toBeDefined();
			expect(user.name).toBe(testUser.name);
			expect(user.email).toBe(testUser.email.toLowerCase());
			expect(user.phone).toBe(testUser.phone);
			expect(user.role).toBe('tourist');
			expect(user.status).toBe('non_verified');
			expect(user.isActive).toBe(true);
		});

		it('should lowercase email automatically', async () => {
			const userData = { ...testUser, email: 'TEST@EXAMPLE.COM' };
			const user = await AccountDB.create(userData);

			expect(user.email).toBe('test@example.com');
		});

		it('should set default role to tourist', async () => {
			const userData = { ...testUser, role: undefined };
			const user = await AccountDB.create(userData);

			expect(user.role).toBe('tourist');
		});

		it('should set default status to non_verified', async () => {
			const user = await AccountDB.create(testUser);

			expect(user.status).toBe('non_verified');
		});

		it('should set default isActive to true', async () => {
			const user = await AccountDB.create(testUser);

			expect(user.isActive).toBe(true);
		});

		it('should create admin user with admin role', async () => {
			const admin = await AccountDB.create(testAdmin);

			expect(admin.role).toBe('admin');
		});
	});

	describe('Password Hashing', () => {
		it('should hash password before saving', async () => {
			const user = await AccountDB.create(testUser);

			// Password should be hashed (not equal to plain text)
			expect(user.password).not.toBe(testUser.password);
			expect(user.password).toBeDefined();
		});

		it('should not rehash password if not modified', async () => {
			const user = await AccountDB.create(testUser);
			const originalHashedPassword = user.password;

			user.name = 'Updated Name';
			await user.save();

			expect(user.password).toBe(originalHashedPassword);
		});

		it('should rehash password when password is modified', async () => {
			const user = await AccountDB.create(testUser);
			const originalHashedPassword = user.password;

			user.password = 'newpassword123';
			await user.save();

			expect(user.password).not.toBe(originalHashedPassword);
		});
	});

	describe('Password Verification', () => {
		it('should verify correct password', async () => {
			const user = await AccountDB.create(testUser);

			const isValid = await user.verifyPassword(testUser.password);
			expect(isValid).toBe(true);
		});

		it('should reject incorrect password', async () => {
			const user = await AccountDB.create(testUser);

			const isValid = await user.verifyPassword('wrongpassword');
			expect(isValid).toBe(false);
		});
	});

	describe('Password Field Selection', () => {
		it('should not include password in default queries', async () => {
			await AccountDB.create(testUser);
			const user = await AccountDB.findOne({ email: testUser.email });

			expect(user?.password).toBeUndefined();
		});

		it('should include password when explicitly selected', async () => {
			await AccountDB.create(testUser);
			const user = await AccountDB.findOne({ email: testUser.email }).select('+password');

			expect(user?.password).toBeDefined();
		});
	});

	describe('Unique Email Constraint', () => {
		it('should enforce unique email constraint', async () => {
			await AccountDB.create(testUser);

			await expect(AccountDB.create(testUser)).rejects.toThrow();
		});
	});

	describe('Timestamps', () => {
		it('should automatically add createdAt and updatedAt', async () => {
			const user = await AccountDB.create(testUser);

			expect(user.createdAt).toBeDefined();
			expect(user.updatedAt).toBeDefined();
		});

		it('should update updatedAt on save', async () => {
			const user = await AccountDB.create(testUser);
			const originalUpdatedAt = user.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			user.name = 'Updated Name';
			await user.save();

			expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});
	});
});
