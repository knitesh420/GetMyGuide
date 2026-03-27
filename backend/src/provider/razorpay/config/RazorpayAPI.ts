import Razorpay from 'razorpay';
import { RAZORPAY_API_KEY, RAZORPAY_API_SECRET } from '../../../config/const';

const RazorpayAPI = new Razorpay({ key_id: RAZORPAY_API_KEY, key_secret: RAZORPAY_API_SECRET });

export default RazorpayAPI;
