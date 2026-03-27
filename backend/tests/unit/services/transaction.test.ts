import { TransactionDB } from '@mongo';
import TransactionService from '@services/transaction';
import { NotFoundError, ServerError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

// Mock Razorpay APIs
jest.mock('@provider/razorpay/api/customers', () => ({
	__esModule: true,
	default: {
		createCustomer: jest.fn(),
	},
}));

jest.mock('@provider/razorpay/api/orders', () => ({
	__esModule: true,
	default: {
		createOrder: jest.fn(),
		getOrderStatus: jest.fn(),
	},
}));

import RazorpayCustomers from '@provider/razorpay/api/customers';
import RazorpayOrders from '@provider/razorpay/api/orders';

describe('Transaction Service', () => {
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

	describe('createTransaction', () => {
		it('should create Razorpay customer, order, and transaction', async () => {
			const customerInfo = {
				name: 'John Doe',
				email: 'john@example.com',
				phone_number: '+1234567890',
			};

			const mockCustomer = {
				id: 'cust_test123',
				name: 'John Doe',
				contact: '+1234567890',
				email: 'john@example.com',
			};

			const mockOrder = {
				id: 'order_test123',
				amount: 500,
				currency: 'INR',
				reference_id: 'ref123',
				status: 'created',
			};

			(RazorpayCustomers.createCustomer as jest.Mock).mockResolvedValue(mockCustomer);
			(RazorpayOrders.createOrder as jest.Mock).mockResolvedValue(mockOrder);

			const result = await TransactionService.createTransaction(customerInfo, 500, {
				reference_id: 'ref123',
				reference_type: 'enrollment',
				data: { enrollment_id: 'ref123' },
				description: 'Test Payment',
			});

			expect(RazorpayCustomers.createCustomer).toHaveBeenCalledWith(customerInfo);
			expect(RazorpayOrders.createOrder).toHaveBeenCalledWith({
				amount: 500,
				customer_id: 'cust_test123',
				reference_id: 'ref123',
				data: { enrollment_id: 'ref123' },
			});

			expect(result).toHaveProperty('transaction_id');
			expect(result).toHaveProperty('razorpay_options');
			expect(result.razorpay_options.order_id).toBe('order_test123');
			expect(result.razorpay_options.amount).toBe(50000); // Converted to paise
			expect(result.razorpay_options.currency).toBe('INR');
			expect(result.razorpay_options.description).toBe('Test Payment');

			// Verify transaction was stored
			const transaction = await TransactionDB.findOne({
				reference_id: 'ref123',
				reference_type: 'enrollment',
			});
			expect(transaction).toBeTruthy();
			expect(transaction?.razorpay_order_id).toBe('order_test123');
			expect(transaction?.razorpay_customer_id).toBe('cust_test123');
			expect(transaction?.amount).toBe(500);
			expect(transaction?.currency).toBe('INR');
		});

		it('should throw ServerError if customer creation fails', async () => {
			const customerInfo = {
				name: 'John Doe',
				email: 'john@example.com',
				phone_number: '+1234567890',
			};

			(RazorpayCustomers.createCustomer as jest.Mock).mockResolvedValue(null);

			await expect(
				TransactionService.createTransaction(customerInfo, 500, {
					reference_id: 'ref123',
					reference_type: 'enrollment',
				})
			).rejects.toThrow(ServerError);
		});
	});

	describe('getTransactionStatus', () => {
		it('should return transaction status and update if changed', async () => {
			await TransactionDB.create({
				reference_id: 'ref123',
				reference_type: 'enrollment',
				razorpay_order_id: 'order_test123',
				razorpay_customer_id: 'cust_test123',
				transaction_id: 'trans_test123',
				status: 'created',
				amount: 500,
				currency: 'INR',
			});

			(RazorpayOrders.getOrderStatus as jest.Mock).mockResolvedValue('paid');

			const result = await TransactionService.getTransactionStatus('trans_test123');

			expect(RazorpayOrders.getOrderStatus).toHaveBeenCalledWith('order_test123');
			expect(result.transaction_id).toBe('trans_test123');
			expect(result.status).toBe('paid');
			expect(result.order_status).toBe('paid');
			expect(result.amount).toBe(500);
			expect(result.currency).toBe('INR');

			// Verify transaction status was updated
			const updatedTransaction = await TransactionDB.findOne({ transaction_id: 'trans_test123' });
			expect(updatedTransaction?.status).toBe('paid');
		});

		it('should return transaction status without updating if unchanged', async () => {
			await TransactionDB.create({
				reference_id: 'ref123',
				reference_type: 'enrollment',
				razorpay_order_id: 'order_test123',
				razorpay_customer_id: 'cust_test123',
				transaction_id: 'trans_test123',
				status: 'created',
				amount: 500,
				currency: 'INR',
			});

			(RazorpayOrders.getOrderStatus as jest.Mock).mockResolvedValue('created');

			const result = await TransactionService.getTransactionStatus('trans_test123');

			expect(result.status).toBe('created');
			expect(result.order_status).toBe('created');
		});

		it('should throw NotFoundError if transaction not found', async () => {
			(RazorpayOrders.getOrderStatus as jest.Mock).mockResolvedValue('created');

			await expect(TransactionService.getTransactionStatus('invalid_transaction')).rejects.toThrow(
				NotFoundError
			);
		});
	});

	describe('getTransaction', () => {
		it('should return transaction by transaction_id', async () => {
			await TransactionDB.create({
				reference_id: 'ref123',
				reference_type: 'enrollment',
				razorpay_order_id: 'order_test123',
				razorpay_customer_id: 'cust_test123',
				transaction_id: 'trans_test123',
				status: 'created',
				amount: 500,
				currency: 'INR',
			});

			const result = await TransactionService.getTransaction('trans_test123');

			expect(result.transaction_id).toBe('trans_test123');
			expect(result.reference_id).toBe('ref123');
			expect(result.reference_type).toBe('enrollment');
		});

		it('should throw NotFoundError if transaction not found', async () => {
			await expect(TransactionService.getTransaction('invalid_transaction')).rejects.toThrow(
				NotFoundError
			);
		});
	});

	describe('getTransactionByReference', () => {
		it('should return most recent transaction by reference_id and reference_type', async () => {
			// Create older transaction
			await TransactionDB.create({
				reference_id: 'ref123',
				reference_type: 'enrollment',
				razorpay_order_id: 'order_old',
				razorpay_customer_id: 'cust_test123',
				transaction_id: 'trans_old',
				status: 'created',
				amount: 500,
				currency: 'INR',
			});

			// Create newer transaction
			await new Promise((resolve) => setTimeout(resolve, 10));

			await TransactionDB.create({
				reference_id: 'ref123',
				reference_type: 'enrollment',
				razorpay_order_id: 'order_new',
				razorpay_customer_id: 'cust_test123',
				transaction_id: 'trans_new',
				status: 'created',
				amount: 500,
				currency: 'INR',
			});

			const result = await TransactionService.getTransactionByReference('ref123', 'enrollment');

			expect(result).toBeTruthy();
			expect(result?.transaction_id).toBe('trans_new');
		});

		it('should return null if no transaction found', async () => {
			const result = await TransactionService.getTransactionByReference(
				'invalid_ref',
				'enrollment'
			);

			expect(result).toBeNull();
		});
	});
});
