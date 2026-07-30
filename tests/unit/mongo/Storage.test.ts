import { StorageDB } from '@mongo';
import mongoose from 'mongoose';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

describe('Storage Model', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	describe('getString', () => {
		it('should retrieve string value by key', async () => {
			const key = 'test-key';
			const value = 'test-value';
			await (StorageDB as unknown as mongoose.Model<unknown>).create({ key, value });

			const result = await StorageDB.getString(key);

			expect(result).toBe(value);
		});

		it('should return null for non-existent key', async () => {
			const result = await StorageDB.getString('non-existent-key');

			expect(result).toBeNull();
		});

		it('should return null when value is undefined', async () => {
			const key = 'test-key';
			await (StorageDB as unknown as mongoose.Model<unknown>).create({
				key,
				object: { data: 'test' },
			});

			const result = await StorageDB.getString(key);

			expect(result).toBeNull();
		});
	});

	describe('getObject', () => {
		it('should retrieve object value by key', async () => {
			const key = 'test-key';
			const objectValue = { data: 'test', number: 123 };
			await (StorageDB as unknown as mongoose.Model<unknown>).create({ key, object: objectValue });

			const result = await StorageDB.getObject(key);

			expect(result).toEqual(objectValue);
		});

		it('should return null for non-existent key', async () => {
			const result = await StorageDB.getObject('non-existent-key');

			expect(result).toBeNull();
		});

		it('should return null when object is undefined', async () => {
			const key = 'test-key';
			await (StorageDB as unknown as mongoose.Model<unknown>).create({ key, value: 'test-value' });

			const result = await StorageDB.getObject(key);

			expect(result).toBeNull();
		});
	});

	describe('setString', () => {
		it('should create new entry with string value', async () => {
			const key = 'new-key';
			const value = 'new-value';

			await StorageDB.setString(key, value);

			const result = await StorageDB.getString(key);
			expect(result).toBe(value);
		});

		it('should update existing entry with string value', async () => {
			const key = 'existing-key';
			const initialValue = 'initial-value';
			const newValue = 'new-value';

			await StorageDB.setString(key, initialValue);
			await StorageDB.setString(key, newValue);

			const result = await StorageDB.getString(key);
			expect(result).toBe(newValue);
		});

		it('should clear object when setting string value', async () => {
			const key = 'test-key';
			await (StorageDB as unknown as mongoose.Model<unknown>).create({
				key,
				object: { data: 'test' },
			});

			await StorageDB.setString(key, 'string-value');

			const storage = await (
				StorageDB as unknown as mongoose.Model<{ key: string; value?: string; object?: unknown }>
			)
				.findOne({ key })
				.lean();
			expect(storage?.object).toBeUndefined();
			expect(storage?.value).toBe('string-value');
		});
	});

	describe('setObject', () => {
		it('should create new entry with object value', async () => {
			const key = 'new-key';
			const objectValue = { data: 'test', number: 123 };

			await StorageDB.setObject(key, objectValue);

			const result = await StorageDB.getObject(key);
			expect(result).toEqual(objectValue);
		});

		it('should update existing entry with object value', async () => {
			const key = 'existing-key';
			const initialObject = { data: 'initial' };
			const newObject = { data: 'new', number: 456 };

			await StorageDB.setObject(key, initialObject);
			await StorageDB.setObject(key, newObject);

			const result = await StorageDB.getObject(key);
			expect(result).toEqual(newObject);
		});

		it('should clear value when setting object value', async () => {
			const key = 'test-key';
			await (StorageDB as unknown as mongoose.Model<unknown>).create({
				key,
				value: 'string-value',
			});

			await StorageDB.setObject(key, { data: 'test' });

			const storage = await (
				StorageDB as unknown as mongoose.Model<{ key: string; value?: string; object?: unknown }>
			)
				.findOne({ key })
				.lean();
			expect(storage?.value).toBeUndefined();
			expect(storage?.object).toEqual({ data: 'test' });
		});
	});

	describe('Expiration', () => {
		it('should set expireAt to 20 minutes from creation by default', async () => {
			const key = 'test-key';
			const value = 'test-value';
			const beforeCreation = Date.now();

			await StorageDB.setString(key, value);

			const storage = await (StorageDB as unknown as mongoose.Model<{ expireAt: Date }>).findOne({
				key,
			});
			expect(storage?.expireAt).toBeDefined();

			const expireTime = storage?.expireAt?.getTime() || 0;
			const expectedExpireTime = beforeCreation + 20 * 60 * 1000;

			// Allow 5 second tolerance
			expect(Math.abs(expireTime - expectedExpireTime)).toBeLessThan(5000);
		});

		it('should have unique key constraint', async () => {
			const key = 'duplicate-key';
			await (StorageDB as unknown as mongoose.Model<unknown>).create({ key, value: 'value1' });

			await expect(
				(StorageDB as unknown as mongoose.Model<unknown>).create({ key, value: 'value2' })
			).rejects.toThrow();
		});
	});

	describe('Integration with Auth Service', () => {
		it('should work with password reset flow', async () => {
			const resetToken = 'reset-token-123';
			const userId = '507f1f77bcf86cd799439011';

			await StorageDB.setString(resetToken, userId);

			const retrievedUserId = await StorageDB.getString(resetToken);
			expect(retrievedUserId).toBe(userId);

			// Simulate token deletion after use
			await (StorageDB as unknown as mongoose.Model<unknown>).findOneAndDelete({ key: resetToken });

			const deletedToken = await StorageDB.getString(resetToken);
			expect(deletedToken).toBeNull();
		});
	});
});
