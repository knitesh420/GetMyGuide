import { RAZORPAY_API_SECRET } from '@config/const';
import { BookingDB, TransactionDB } from '@mongo';
import WebhookEventDB from '@mongo/repo/WebhookEvent';
import PaymentService from '@services/payment';
import crypto from 'crypto';
import express from 'express';
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

	async function seedPaidOrder(amount: number) {
		const orderId = `order_${crypto.randomBytes(6).toString('hex')}`;
		const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;

		await TransactionDB.create({
			reference_id: 'temp-ref',
			reference_type: 'pending_booking',
			type: 'tourist',
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
	});
});
