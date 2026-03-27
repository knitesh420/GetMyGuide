export const parseAmount = (amount: number) => {
	return Number(amount.toFixed(2));
};

export function validatePhoneNumber(num: string) {
	const re = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im;

	return re.test(num);
}

export function intersection<T>(arr1: T[], arr2: T[]) {
	const set = new Set(arr2.map((e) => String(e)));

	// Use the built-in Set method `has` to check for common elements
	const res = arr1.map((e) => String(e)).filter((item) => set.has(String(item)));
	return new Set(res);
}
