import { error, info } from 'node-be-utilities';
import RazorpayAPI from '../../config/RazorpayAPI';

async function getPayment(payment_id: string) {
	info('Razorpay: Fetching payment', {
		provider: 'razorpay',
		operation: 'get_payment',
		paymentId: payment_id,
	});

	try {
		const payment = await RazorpayAPI.payments.fetch(payment_id);

		const paymentData = {
			payment_id: payment.id,
			amount: Number(payment.amount) / 100,
			currency: payment.currency,
			order_id: payment.order_id,
			status: payment.status,
		};

		info('Razorpay: Payment fetched successfully', {
			provider: 'razorpay',
			operation: 'get_payment',
			paymentId: payment_id,
			amount: paymentData.amount,
			currency: paymentData.currency,
			status: paymentData.status,
			orderId: paymentData.order_id,
		});

		return paymentData;
	} catch (err) {
		error('Razorpay: Failed to fetch payment', {
			provider: 'razorpay',
			operation: 'get_payment',
			paymentId: payment_id,
			error: err,
		});
		throw err;
	}
}
export default {
	getPayment,
};
