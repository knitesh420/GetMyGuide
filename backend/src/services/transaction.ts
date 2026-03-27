import { RAZORPAY_API_KEY } from '@config/const';
import { TransactionDB } from '@mongo';
import RazorpayCustomers from '@provider/razorpay/api/customers';
import RazorpayOrders from '@provider/razorpay/api/orders';
import { randomBytes } from 'crypto';
import { NotFoundError, ServerError } from 'node-be-utilities';

interface CustomerInfo {
	name: string;
	email: string;
	phone_number: string;
}

interface TransactionData {
	[key: string]: string;
}

interface CreateTransactionOptions {
	reference_id: string;
	reference_type: string;
	data?: TransactionData;
	description?: string;
}

interface CreateTransactionResult {
	transaction_id: string;
	razorpay_options: {
		description: string;
		currency: string;
		amount: number;
		name: string;
		order_id: string;
		prefill: {
			name: string;
			contact: string;
			email: string;
		};
		key: string;
	};
}

class TransactionService {
	/**
	 * Create a transaction - creates Razorpay customer, order, and stores transaction
	 */
	async createTransaction(
		customerInfo: CustomerInfo,
		amount: number,
		options: CreateTransactionOptions
	): Promise<CreateTransactionResult> {
		const { reference_id, reference_type, data = {}, description = 'Payment' } = options;
		// Create Razorpay customer
		const customer = await RazorpayCustomers.createCustomer({
			name: customerInfo.name,
			email: customerInfo.email,
			phone_number: customerInfo.phone_number,
		});

		if (!customer) {
			throw new ServerError('Failed to create Razorpay customer');
		}

		// Create Razorpay order
		const order = await RazorpayOrders.createOrder({
			amount,
			customer_id: customer.id,
			reference_id,
			data,
		});

		// Generate transaction ID
		const transaction_id = randomBytes(16).toString('hex');

		// Store transaction
		await TransactionDB.create({
			reference_id,
			reference_type,
			razorpay_order_id: order.id,
			razorpay_customer_id: customer.id,
			transaction_id,
			status: order.status,
			amount: order.amount,
			currency: order.currency,
		});

		return {
			transaction_id,
			razorpay_options: {
				description,
				currency: order.currency,
				amount: order.amount * 100, // Convert to paise
				name: 'Get My Guide',
				order_id: order.id,
				prefill: {
					name: customerInfo.name,
					contact: customerInfo.phone_number,
					email: customerInfo.email,
				},
				key: RAZORPAY_API_KEY,
			},
		};
	}

	/**
	 * Get transaction status by transaction_id
	 */
	async getTransactionStatus(transaction_id: string): Promise<{
		transaction_id: string;
		status: string;
		order_status: string;
		amount: number;
		currency: string;
	}> {
		// Find transaction
		const transaction = await TransactionDB.findOne({ transaction_id });

		if (!transaction) {
			throw new NotFoundError('Transaction not found');
		}

		// Get current order status from Razorpay
		const orderStatus = await RazorpayOrders.getOrderStatus(transaction.razorpay_order_id);

		// Update transaction status if it has changed
		if (transaction.status !== orderStatus) {
			transaction.status = orderStatus;
			await transaction.save();
		}

		return {
			transaction_id: transaction.transaction_id,
			status: transaction.status,
			order_status: orderStatus,
			amount: transaction.amount,
			currency: transaction.currency,
		};
	}

	/**
	 * Get transaction by transaction_id
	 */
	async getTransaction(transaction_id: string) {
		const transaction = await TransactionDB.findOne({ transaction_id });

		if (!transaction) {
			throw new NotFoundError('Transaction not found');
		}

		return transaction;
	}

	/**
	 * Get transaction by reference_id and reference_type
	 */
	async getTransactionByReference(reference_id: string, reference_type: string) {
		const transaction = await TransactionDB.findOne({
			reference_id,
			reference_type,
		}).sort({ createdAt: -1 }); // Get most recent transaction

		return transaction;
	}
}

export default new TransactionService();
