import express from 'express';
import AdvertisementRoute from './advertisement/advertisement.route';
import BlogRoute from './blog/blog.route';
import BookingRoute from './booking/booking.route';
import GuideRoute from './guide/guide.route';
import PackageRoute from './package/package.route';
import SessionRoute from './session/session.route';
import LeadRoute from './lead/lead.route';
import UserRoute from './user/user.route';

import { NotFoundError, Respond, ServerError } from 'node-be-utilities';
import { FileUpload, ONLY_MEDIA_ALLOWED, SingleFileUploadOptions } from '../utils/files';

const router = express.Router();

// Next routes will be webhooks routes

router.use('/advertisement', AdvertisementRoute);
router.use('/session', SessionRoute);
router.use('/blog', BlogRoute);
router.use('/booking', BookingRoute);
router.use('/guide', GuideRoute);
router.use('/guides', GuideRoute);
router.use('/package', PackageRoute);
router.use('/lead', LeadRoute);
router.use('/user', UserRoute);

router.post('/upload-media', async function (req, res, next) {
	const fileUploadOptions: SingleFileUploadOptions = {
		field_name: 'file',
		options: {
			fileFilter: ONLY_MEDIA_ALLOWED,
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

router.get('/media/:path/:filename', async function (req, res, next) {
	try {
		const filePath = __basedir + '/static/' + req.params.path + '/' + req.params.filename;
		res.sendFile(filePath, (err) => {
			if (err) {
				return next(new NotFoundError('File not found'));
			}
		});
	} catch {
		return next(new NotFoundError('File not found'));
	}
});

export default router;
