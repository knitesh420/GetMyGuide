import { error, info } from 'node-be-utilities';
import RazorpayAPI from '../../config/RazorpayAPI';

type Props = {
	amount: number;
	reference_id: string;
	customer_id: string;
	data?: { [key: string]: string };
};

async function createOrder({ amount, customer_id, reference_id, data = {} }: Props) {
	info('Razorpay: Creating order', {
		provider: 'razorpay',
		operation: 'create_order',
		amount,
		customerId: customer_id,
		referenceId: reference_id,
		hasNotes: Object.keys(data).length > 0,
	});

	try {
		const amount_in_paise = amount * 100;
		const order = await RazorpayAPI.orders.create({
			amount: amount_in_paise,
			currency: 'INR',
			receipt: reference_id,
			customer_id: customer_id,
			notes: data,
		});

		const orderData = {
			id: order.id,
			amount: Number(order.amount) / 100,
			currency: order.currency,
			reference_id: order.receipt,
			status: order.status,
		};

		info('Razorpay: Order created successfully', {
			provider: 'razorpay',
			operation: 'create_order',
			orderId: orderData.id,
			amount: orderData.amount,
			currency: orderData.currency,
			status: orderData.status,
			referenceId: orderData.reference_id,
		});

		return orderData;
	} catch (err) {
		error('Razorpay: Failed to create order', {
			provider: 'razorpay',
			operation: 'create_order',
			amount,
			customerId: customer_id,
			referenceId: reference_id,
			error: err,
		});
		throw err;
	}
}

async function getOrder(order_id: string) {
	info('Razorpay: Fetching order', {
		provider: 'razorpay',
		operation: 'get_order',
		orderId: order_id,
	});

	try {
		const order = await RazorpayAPI.orders.fetch(order_id);

		const orderData = {
			id: order.id,
			amount: Number(order.amount) / 100,
			currency: order.currency,
			reference_id: order.receipt,
			status: order.status,
		};

		info('Razorpay: Order fetched successfully', {
			provider: 'razorpay',
			operation: 'get_order',
			orderId: order_id,
			amount: orderData.amount,
			currency: orderData.currency,
			status: orderData.status,
		});

		return orderData;
	} catch (err) {
		error('Razorpay: Failed to fetch order', {
			provider: 'razorpay',
			operation: 'get_order',
			orderId: order_id,
			error: err,
		});
		throw err;
	}
}

async function getOrderStatus(order_id: string): Promise<'created' | 'attempted' | 'paid'> {
	const order = await getOrder(order_id);
	return order.status;
}

export default {
	createOrder,
	getOrder,
	getOrderStatus,
};
