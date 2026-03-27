import Customers from './customers';
import Orders from './orders';
import Payments from './payments';
import Refunds from './refunds';
import Validations from './validator';

const RazorpayProvider = {
	customers: Customers,
	orders: Orders,
	payments: Payments,
	refunds: Refunds,
	validations: Validations,
};

export default RazorpayProvider;
