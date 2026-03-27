import { intersection, parseAmount, validatePhoneNumber } from '@utils/ExpressUtils';

describe('ExpressUtils', () => {
	describe('parseAmount', () => {
		it('should round to 2 decimal places', () => {
			expect(parseAmount(10.123456)).toBe(10.12);
			expect(parseAmount(10.999)).toBe(11);
			expect(parseAmount(10.1)).toBe(10.1);
		});
	});

	describe('validatePhoneNumber', () => {
		it('should validate correct phone numbers', () => {
			expect(validatePhoneNumber('+1234567890')).toBe(true);
			expect(validatePhoneNumber('(123) 456-7890')).toBe(true);
			expect(validatePhoneNumber('123-456-7890')).toBe(true);
			expect(validatePhoneNumber('123.456.7890')).toBe(true);
		});

		it('should reject invalid phone numbers', () => {
			expect(validatePhoneNumber('123')).toBe(false);
			expect(validatePhoneNumber('abc')).toBe(false);
			expect(validatePhoneNumber('')).toBe(false);
		});
	});

	describe('intersection', () => {
		it('should find intersection of two arrays', () => {
			const arr1 = [1, 2, 3, 4];
			const arr2 = [3, 4, 5, 6];
			const result = intersection(arr1, arr2);

			expect(result).toBeInstanceOf(Set);
			expect(result.has('3')).toBe(true);
			expect(result.has('4')).toBe(true);
			expect(result.has('1')).toBe(false);
		});

		it('should return empty set for no intersection', () => {
			const arr1 = [1, 2, 3];
			const arr2 = [4, 5, 6];
			const result = intersection(arr1, arr2);

			expect(result.size).toBe(0);
		});
	});
});
