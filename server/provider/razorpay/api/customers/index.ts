import { error, info } from 'node-be-utilities';
import RazorpayAPI from '../../config/RazorpayAPI';

async function createCustomer(details: { name: string; email: string; phone_number: string }) {
	info('Razorpay: Creating customer', {
		provider: 'razorpay',
		operation: 'create_customer',
		name: details.name,
		email: details.email,
		phoneNumber: details.phone_number,
	});

	try {
		const customer = await RazorpayAPI.customers.create({
			name: details.name,
			contact: details.phone_number,
			email: details.email,
		});

		const customerData = {
			id: customer.id,
			name: customer.name,
			contact: customer.contact,
			email: customer.email,
		};

		info('Razorpay: Customer created successfully', {
			provider: 'razorpay',
			operation: 'create_customer',
			customerId: customerData.id,
			name: customerData.name,
			email: customerData.email,
		});

		return customerData;
	} catch (err: any) {
		error('Razorpay: Failed to create customer, attempting to fetch by contact', {
			provider: 'razorpay',
			operation: 'create_customer',
			name: details.name,
			email: details.email,
			phoneNumber: details.phone_number,
			statusCode: err.statusCode,
			error: err,
		});

		if (err.statusCode === 400) {
			return fetchCustomerByContact(details.phone_number);
		}

		return null;
	}
}

async function fetchCustomerByContact(number: string) {
	const customers = await RazorpayAPI.customers.all();

	const customer = customers.items.find((customer: any) =>
		customer.contact?.toString().includes(number)
	);
	if (!customer) {
		return null;
	}

	return {
		id: customer.id,
		name: customer.name,
		contact: customer.contact,
		email: customer.email,
	};
}

async function fetchCustomer(id: string) {
	const customer = await RazorpayAPI.customers.fetch(id);

	return {
		id: customer.id,
		name: customer.name,
		contact: customer.contact,
		email: customer.email,
	};
}

async function fetchToken(customer_id: string) {
	const tokens = await RazorpayAPI.customers.fetchTokens(customer_id);
	if (tokens.items.length === 0) return null;
	const token = tokens.items[0];

	return {
		id: token.id,
		customer_id: token.customer_id,
		token: token.token,
	};
}

export default {
	createCustomer,
	fetchCustomer,
	fetchCustomerByContact,
	fetchToken,
};
