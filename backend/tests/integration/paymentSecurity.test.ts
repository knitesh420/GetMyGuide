import { RAZORPAY_API_SECRET } from '@config/const';
import { BookingDB, TransactionDB } from '@mongo';
import WebhookEventDB from '@mongo/repo/WebhookEvent';
import PaymentService from '@services/payment';
import crypto from 'crypto';
import express from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import configServer from '../../src/server-config';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Regression cover for the payment-integrity defects found in the production
 * readiness audit. Each test here fails against the previous implementation.
 */
describe('Payment integrity', () => {
	let app: express.Application;

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	/** A signature Razorpay would have produced for this order/payment pair. */
	function sign(orderId: string, paymentId: string): string {
		return crypto
			.createHmac('sha256', RAZORPAY_API_SECRET)
			.update(`${orderId}|${paymentId}`)
			.digest('hex');
	}

	/** `account` omitted models a guest checkout, which belongs to no dashboard. */
	async function seedPaidOrder(amount: number, account?: Types.ObjectId) {
		const orderId = `order_${crypto.randomBytes(6).toString('hex')}`;
		const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;

		await TransactionDB.create({
			reference_id: 'temp-ref',
			reference_type: 'pending_booking',
			type: 'tourist',
			account: account ?? null,
			razorpay_order_id: orderId,
			razorpay_customer_id: 'cust_test',
			transaction_id: crypto.randomBytes(16).toString('hex'),
			status: 'pending',
			amount,
			currency: 'INR',
		});

		return { orderId, paymentId, signature: sign(orderId, paymentId) };
	}

	/**
	 * calculateBookingPrice derives the amount from this configuration, so the
	 * booking is built first and the transaction seeded to match whatever it
	 * comes to — the point of these tests is the fields AROUND the price.
	 */
	function bookingPayload(extra: Record<string, unknown> = {}) {
		return {
			tourist_info: {
				name: 'Attacker',
				gender: 'other',
				phone: '+911234567890',
				email: 'attacker@example.com',
				country: 'India',
			},
			travel_details: {
				places: ['Taj Mahal'],
				city: 'Agra',
				date: new Date(Date.now() + 7 * 86_400_000),
				no_of_person: 2,
				preferences: { hotel: false, taxi: false },
			},
			guide_preferences: { guide_language: ['English'], gender: 'none' },
			booking_configuration: {
				duration: 'full-day',
				foreign_language_required: false,
				early_late_hours: false,
				extra_city_allowances: false,
				special_event_allowances: [],
				price: 0,
			},
			...extra,
		};
	}

	async function priceOf(payload: any): Promise<number> {
		const { calculateBookingPrice } = await import('@utils/priceCalculator');
		return calculateBookingPrice(
			payload.travel_details.no_of_person,
			payload.travel_details.city,
			payload.booking_configuration
		).total;
	}

	it('refuses to create a second booking from one payment (replay)', async () => {
		const payload = bookingPayload();
		const amount = await priceOf(payload);
		const { orderId, paymentId, signature } = await seedPaidOrder(amount);
		const booking_data = Buffer.from(JSON.stringify(payload)).toString('base64');

		const body = {
			razorpay_order_id: orderId,
			razorpay_payment_id: paymentId,
			razorpay_signature: signature,
			booking_data,
		};

		const first = await request(app).post('/booking/verify-guest-booking').send(body);
		expect(first.status).toBe(201);

		// Replaying the exact same verified payment must not mint another booking.
		const second = await request(app).post('/booking/verify-guest-booking').send(body);
		expect([200, 201, 409]).toContain(second.status);

		expect(await BookingDB.countDocuments({})).toBe(1);
	});

	it('ignores attacker-controlled fields smuggled into booking_data', async () => {
		const someoneElse = '507f1f77bcf86cd799439011';
		const payload = bookingPayload({
			// None of these are the tourist's to set. Before the fix they were
			// spread straight into BookingDB.create().
			balance_due: 0,
			advance_paid: 999999,
			allocated_guide: someoneElse,
			linked_to: someoneElse,
			status: 'completed',
			// Deliberately not BK000001: that is exactly what the server-side
			// sequence generates for the first booking in a clean database, so it
			// cannot tell an echoed value from a generated one.
			bookingCode: 'BK555555',
		});
		const amount = await priceOf(payload);
		const { orderId, paymentId, signature } = await seedPaidOrder(amount);

		const res = await request(app)
			.post('/booking/verify-guest-booking')
			.send({
				razorpay_order_id: orderId,
				razorpay_payment_id: paymentId,
				razorpay_signature: signature,
				booking_data: Buffer.from(JSON.stringify(payload)).toString('base64'),
			});

		expect(res.status).toBe(201);

		const booking = await BookingDB.findOne({});
		expect(booking).not.toBeNull();
		expect(booking!.allocated_guide).toBeUndefined();
		expect(booking!.balance_due).toBeUndefined();
		expect(booking!.advance_paid).toBeUndefined();
		// A guest booking has no owner, whatever the payload claimed.
		expect(booking!.linked_to).toBeUndefined();
		// status is set by the server, not the caller.
		expect(booking!.status).toBe('successful');
		// bookingCode is generated server-side, never accepted from input.
		expect(booking!.bookingCode).not.toBe('BK555555');
		expect(booking!.bookingCode).toMatch(/^BK\d{6}$/);
	});

	it('rejects a payment whose signature does not match', async () => {
		const payload = bookingPayload();
		const amount = await priceOf(payload);
		const { orderId, paymentId } = await seedPaidOrder(amount);

		const res = await request(app)
			.post('/booking/verify-guest-booking')
			.send({
				razorpay_order_id: orderId,
				razorpay_payment_id: paymentId,
				razorpay_signature: 'f'.repeat(64),
				booking_data: Buffer.from(JSON.stringify(payload)).toString('base64'),
			});

		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(await BookingDB.countDocuments({})).toBe(0);
	});

	describe('webhook', () => {
		const payload = {
			event: 'payment.captured',
			payload: { payment: { entity: { id: 'pay_abc123', order_id: 'order_abc123' } } },
		};

		it('records the event id taken from the header', async () => {
			const result = await PaymentService.handleWebhookEvent(payload, 'evt_first');

			expect(result.message).not.toMatch(/already processed/);
			const stored = await WebhookEventDB.findOne({ eventId: 'evt_first' });
			expect(stored).not.toBeNull();
		});

		it('processes a repeated delivery of the same event only once', async () => {
			await PaymentService.handleWebhookEvent(payload, 'evt_dup');
			const second = await PaymentService.handleWebhookEvent(payload, 'evt_dup');

			expect(second.message).toMatch(/already processed/);
			expect(await WebhookEventDB.countDocuments({ eventId: 'evt_dup' })).toBe(1);
		});

		it('does not treat a different event as a duplicate of an earlier one', async () => {
			// The regression: with eventId undefined, the dedup lookup collapsed to
			// findOne({}) and every event after the first looked like a repeat.
			await PaymentService.handleWebhookEvent(payload, 'evt_one');
			const other = await PaymentService.handleWebhookEvent(payload, 'evt_two');

			expect(other.message).not.toMatch(/already processed/);
			expect(await WebhookEventDB.countDocuments({})).toBe(2);
		});

		it('rejects a webhook with no signature header', async () => {
			const res = await request(app).post('/payment/webhook').send(payload);
			expect(res.status).toBeGreaterThanOrEqual(400);
		});

		/** A payment.failed body carrying Razorpay's diagnosis of the decline. */
		function failedPayload(orderId: string, paymentId: string) {
			return {
				event: 'payment.failed',
				payload: {
					payment: {
						entity: {
							id: paymentId,
							order_id: orderId,
							method: 'card',
							error_code: 'BAD_REQUEST_ERROR',
							error_description: 'Your payment was declined by the bank.',
							error_source: 'bank',
							error_step: 'payment_authorization',
							error_reason: 'payment_failed',
						},
					},
				},
			};
		}

		it('records why the payment failed, not just that it did', async () => {
			const { orderId, paymentId } = await seedPaidOrder(1000);

			await PaymentService.handleWebhookEvent(failedPayload(orderId, paymentId), 'evt_failed');

			const transaction = await TransactionDB.findOne({ razorpay_order_id: orderId });
			expect(transaction!.status).toBe('failed');
			expect(transaction!.failure?.code).toBe('BAD_REQUEST_ERROR');
			expect(transaction!.failure?.description).toBe('Your payment was declined by the bank.');
			expect(transaction!.failure?.source).toBe('bank');
			expect(transaction!.failure?.step).toBe('payment_authorization');
			expect(transaction!.failure?.method).toBe('card');
		});

		it('leaves no failure record when Razorpay supplies no diagnosis', async () => {
			const { orderId, paymentId } = await seedPaidOrder(1000);

			await PaymentService.handleWebhookEvent(
				{
					event: 'payment.failed',
					payload: { payment: { entity: { id: paymentId, order_id: orderId } } },
				},
				'evt_bare'
			);

			const transaction = await TransactionDB.findOne({ razorpay_order_id: orderId });
			expect(transaction!.status).toBe('failed');
			// An absent `failure` has to mean "we were told nothing" — never an
			// empty husk that reads as a diagnosis in the admin view.
			expect(transaction!.failure).toBeUndefined();
		});

		it('keeps a declined booking payment as failed, not pending_verification', async () => {
			// The regression: a booking order's reference_id is a throwaway token,
			// so updateRegistrationStatus cast it to an Account id, threw a
			// CastError on all three attempts, and downgraded the gateway's
			// verdict to pending_verification — hiding a real decline.
			const { orderId, paymentId } = await seedPaidOrder(1000);

			await PaymentService.handleWebhookEvent(failedPayload(orderId, paymentId), 'evt_no_cast');

			const transaction = await TransactionDB.findOne({ razorpay_order_id: orderId });
			expect(transaction!.status).toBe('failed');
		});

		it('puts a declined payment on the payer’s own dashboard', async () => {
			// `reference_id` cannot answer "whose was this?" for a booking, so
			// without the account link a tourist's declined card was invisible to
			// them — no invoice, no booking, nothing.
			const mine = new Types.ObjectId();
			const someoneElse = new Types.ObjectId();

			const own = await seedPaidOrder(1000, mine);
			const other = await seedPaidOrder(2000, someoneElse);

			await PaymentService.handleWebhookEvent(failedPayload(own.orderId, own.paymentId), 'evt_mine');
			await PaymentService.handleWebhookEvent(
				failedPayload(other.orderId, other.paymentId),
				'evt_theirs'
			);

			const rows = await PaymentService.listMyFailedPayments(mine);

			expect(rows).toHaveLength(1);
			expect(rows[0].amount).toBe(1000);
			expect(rows[0].failure?.description).toBe('Your payment was declined by the bank.');
			// An abandoned checkout wrote no booking, so there is nothing to link to.
			expect(rows[0].bookingId).toBeNull();
		});

		it('does not leak a guest booking failure into anyone’s dashboard', async () => {
			const { orderId, paymentId } = await seedPaidOrder(1000);
			await PaymentService.handleWebhookEvent(failedPayload(orderId, paymentId), 'evt_guest');

			// Seeded with no account — a guest checkout. It belongs to no dashboard.
			expect(await PaymentService.listMyFailedPayments(new Types.ObjectId())).toHaveLength(0);
		});

		it('does not mis-stamp an unrelated transaction sharing the reference id', async () => {
			// reference_id is not unique — a guide has one per renewal. The old
			// exhaustion path updated by reference_id alone and could stamp the
			// wrong row.
			const older = await seedPaidOrder(1000);
			const newer = await seedPaidOrder(2000);

			await PaymentService.handleWebhookEvent(
				failedPayload(newer.orderId, newer.paymentId),
				'evt_scoped'
			);

			const untouched = await TransactionDB.findOne({ razorpay_order_id: older.orderId });
			expect(untouched!.status).toBe('pending');
		});
	});
});
