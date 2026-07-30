import { RAZORPAY_API_KEY } from '@config/const';
import { TransactionDB } from '@mongo';
import type { TransactionType } from '@mongo/types/transaction';
import RazorpayCustomers from '@provider/razorpay/api/customers';
import RazorpayOrders from '@provider/razorpay/api/orders';
import RazorpayRefunds from '@provider/razorpay/api/refunds';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { NotFoundError, ServerError, error as logError, info } from 'node-be-utilities';

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
	type: TransactionType;
	/**
	 * The account paying. Pass it whenever the caller is authenticated — it is
	 * what lets a failed attempt show up on that person's own dashboard, which
	 * `reference_id` can't do for bookings. Omitted only for guest bookings.
	 */
	account?: Types.ObjectId | string;
	data?: TransactionData;
	description?: string;
	/**
	 * Server-side snapshot of what is being bought. Stored on the transaction and
	 * read back at verify time so the order's terms can't be swapped after payment.
	 * Never sent to Razorpay — use `data` for that.
	 */
	metadata?: Record<string, unknown>;
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
		const {
			reference_id,
			reference_type,
			type,
			account,
			data = {},
			description = 'Payment',
			metadata,
		} = options;
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
			type,
			razorpay_order_id: order.id,
			razorpay_customer_id: customer.id,
			transaction_id,
			status: 'pending',
			amount: order.amount,
			currency: order.currency,
			account: account ?? null,
			// Snapshot the payer. Booking orders write no Booking until payment
			// clears, so without this a failed booking leaves nothing behind that
			// says who was trying to pay.
			customer: {
				name: customerInfo.name,
				email: customerInfo.email,
				phone: customerInfo.phone_number,
			},
			...(metadata ? { metadata } : {}),
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

		// Map Razorpay order status to our transaction status
		const statusMap: Record<string, string> = {
			created: 'pending',
			attempted: 'pending',
			paid: 'paid',
		};
		const mappedStatus = statusMap[orderStatus] || transaction.status;

		if (transaction.status !== mappedStatus) {
			transaction.status = mappedStatus as any;
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

	/**
	 * Check if a payment ID has already been recorded as successful.
	 * Used to detect duplicate payments.
	 */
	async isDuplicatePayment(razorpay_payment_id: string): Promise<boolean> {
		const existing = await TransactionDB.findOne({
			razorpay_payment_id,
			status: { $in: ['success', 'paid'] },
		});
		return !!existing;
	}

	/**
	 * Trigger a refund for a payment.
	 */
	async refundPayment(
		paymentId: string,
		amount: number,
		referenceId: string,
		reason: string = 'duplicate_payment'
	) {
		try {
			const refund = await RazorpayRefunds.createRefund({
				payment_id: paymentId,
				amount,
				reference_id: referenceId,
				data: { reason },
			});

			// Update transaction status
			await TransactionDB.findOneAndUpdate(
				{ razorpay_payment_id: paymentId },
				{ status: 'refunded' }
			);

			info('Transaction: Refund processed', {
				paymentId,
				refundId: refund.id,
				amount,
			});

			return refund;
		} catch (err) {
			logError('Transaction: Refund failed', {
				paymentId,
				amount,
				referenceId,
				error: err,
			});
			throw new ServerError('Failed to process refund');
		}
	}
}

export default new TransactionService();
