import RazorpayAPI from '../../config/RazorpayAPI';

type CreateRefundProps = {
	payment_id: string;
	amount: number;
	reference_id: string;
	data: { [key: string]: string };
};

async function createRefund({ payment_id, amount, reference_id, data }: CreateRefundProps) {
	const refund = await RazorpayAPI.payments.refund(payment_id, {
		amount: amount * 100,
		speed: 'optimum',
		notes: data,
		receipt: reference_id,
	});

	return {
		id: refund.id,
		amount: Number(refund.amount) / 100,
		currency: refund.currency,
		reference_id: refund.receipt,
		status: refund.status,
	};
}

type GetRefundProps = {
	refund_id: string;
	payment_id: string;
};

async function getRefund({ refund_id, payment_id }: GetRefundProps) {
	const refund = await RazorpayAPI.payments.fetchRefund(payment_id, refund_id);
	return {
		id: refund.id,
		amount: Number(refund.amount) / 100,
		currency: refund.currency,
		reference_id: refund.receipt,
		status: refund.status,
	};
}

async function getRefundStatus({
	refund_id,
	payment_id,
}: GetRefundProps): Promise<'pending' | 'processed' | 'failed'> {
	const refund = await getRefund({ refund_id, payment_id });
	return refund.status;
}

export default {
	createRefund,
	getRefund,
	getRefundStatus,
};
