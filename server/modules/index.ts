import express from 'express';
import AdvertisementRoute from './advertisement/advertisement.route';
import AssignmentRoute from './assignment/assignment.route';
import BlogRoute from './blog/blog.route';
import BookingRoute from './booking/booking.route';
import CashPaymentRoute from './cashPayment/cashPayment.route';
import DashboardRoute from './dashboard/dashboard.route';
import EarningRoute from './earning/earning.route';
import GuideRoute from './guide/guide.route';
import GuideAvailabilityRoute from './guideAvailability/guideAvailability.route';
import InvoiceRoute from './invoice/invoice.route';
import LocationRoute from './location/location.route';
import MessageRoute from './message/message.route';
import NotificationRoute from './notification/notification.route';
import PackageRoute from './package/package.route';
import PaymentRoute from './payment/payment.route';
import RefundRoute from './refund/refund.route';
import ReportRoute from './report/report.route';
import ReviewRoute from './review/review.route';
import SessionRoute from './session/session.route';
import LeadRoute from './lead/lead.route';
import TourGuideRoute from './tourguide/tourguide.route';
import TouristRoute from './tourist/tourist.route';
import TripRoute from './trip/trip.route';
import UserRoute from './user/user.route';

import { NotFoundError, ServerError } from 'node-be-utilities';
import { Respond } from '@utils/respond';
import { FileUpload, ONLY_MEDIA_ALLOWED, SingleFileUploadOptions } from '../utils/files';
import { VerifySession } from '../middleware';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Webhook and payment routes
router.use('/payment', PaymentRoute);

router.use('/advertisement', AdvertisementRoute);
router.use('/assignment', AssignmentRoute);
router.use('/session', SessionRoute);
router.use('/blog', BlogRoute);
router.use('/booking', BookingRoute);
// Admin-recorded cash payments to guides. Independent of /payment (Razorpay).
router.use('/cash-payment', CashPaymentRoute);
router.use('/dashboard', DashboardRoute);
router.use('/earning', EarningRoute);
router.use('/guide', GuideRoute);
router.use('/guides', GuideRoute);
router.use('/guide-availability', GuideAvailabilityRoute);
router.use('/invoice', InvoiceRoute);
router.use('/location', LocationRoute);
router.use('/locations', LocationRoute);
router.use('/message', MessageRoute);
router.use('/notification', NotificationRoute);
router.use('/package', PackageRoute);
router.use('/refund', RefundRoute);
router.use('/report', ReportRoute);
router.use('/review', ReviewRoute);
router.use('/lead', LeadRoute);
// Direct guide booking: the tourist picks the guide, rather than an admin
// allocating one afterwards as in /booking.
router.use('/tourguide', TourGuideRoute);
router.use('/tourist', TouristRoute);
router.use('/trip', TripRoute);
// Mounted at both, as with /guide and /guides — the frontend calls both spellings.
router.use('/user', UserRoute);
router.use('/users', UserRoute);

router.post('/upload-media', VerifySession, async function (req, res, next) {
	const fileUploadOptions: SingleFileUploadOptions = {
		field_name: 'file',
		options: {
			fileFilter: ONLY_MEDIA_ALLOWED,
			// Every other upload path in the app caps file size; this one did not,
			// which let any authenticated account write unbounded data to the
			// server's disk. 25MB matches the JSON body cap.
			limits: { fileSize: 25 * 1024 * 1024, files: 1 },
		},
	};

	try {
		const uploadedFile = await FileUpload.SingleFileUpload(req, res, fileUploadOptions);
		return Respond({
			res,
			status: 200,
			data: {
				name: uploadedFile.filename,
			},
		});
	} catch {
		return next(new ServerError('File upload failed'));
	}
});

router.get('/media/:path/:filename', function (req, res, next) {
	// Resolve inside the static directory and verify the result stays contained.
	// Express URL-decodes route params, so without this a request such as
	// /media/..%2f..%2f..%2fetc/passwd would escape 'static' and stream arbitrary
	// files off the host (path traversal).
	const baseDir = path.resolve(__basedir, 'static');
	const filePath = path.resolve(baseDir, req.params.path, req.params.filename);

	if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
		return next(new NotFoundError('File not found'));
	}

	if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
		return next(new NotFoundError('File not found'));
	}

	const stat = fs.statSync(filePath);
	const fileSize = stat.size;
	const range = req.headers.range;

	const ext = req.params.filename.split('.').pop()?.toLowerCase();
	// Only raster images and video are rendered inline. Anything else — notably
	// SVG, which can carry <script> — is served as an opaque download so an
	// uploaded file can't execute as active content in this origin. The upload
	// MIME filter is spoofable (client-set Content-Type), so this is the real
	// guard, together with the global X-Content-Type-Options: nosniff header.
	const mimeTypes: Record<string, string> = {
		mp4: 'video/mp4',
		webm: 'video/webm',
		ogg: 'video/ogg',
		mov: 'video/quicktime',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
	};
	const inlineType = mimeTypes[ext || ''];
	const contentType = inlineType || 'application/octet-stream';
	const disposition = inlineType ? 'inline' : 'attachment';

	if (range) {
		const parts = range.replace(/bytes=/, '').split('-');
		const start = parseInt(parts[0], 10);
		const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
		const chunkSize = end - start + 1;

		const stream = fs.createReadStream(filePath, { start, end });
		res.writeHead(206, {
			'Content-Range': `bytes ${start}-${end}/${fileSize}`,
			'Accept-Ranges': 'bytes',
			'Content-Length': chunkSize,
			'Content-Type': contentType,
			'Content-Disposition': disposition,
		});
		stream.pipe(res);
	} else {
		res.writeHead(200, {
			'Content-Length': fileSize,
			'Content-Type': contentType,
			'Accept-Ranges': 'bytes',
			'Content-Disposition': disposition,
		});
		fs.createReadStream(filePath).pipe(res);
	}
});

export default router;
