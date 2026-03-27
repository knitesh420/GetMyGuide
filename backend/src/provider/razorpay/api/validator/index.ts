import crypto from 'crypto';
import { RAZORPAY_API_SECRET } from '../../../../config/const';

type VerifyHashProps = {
	payment_id: string;
	order_id: string;
	signature: string;
};
const VerifyHash = async ({
	payment_id,
	order_id,
	signature,
}: VerifyHashProps): Promise<boolean> => {
	const body = order_id + '|' + payment_id;

	const expectedSignature = crypto
		.createHmac('sha256', RAZORPAY_API_SECRET)
		.update(body)
		.digest('hex');

	return expectedSignature === signature;
};

export default {
	VerifyHash,
};
