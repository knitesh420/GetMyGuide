import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './notification.controller';
import { NotificationAdminListValidator, NotificationListValidator } from './notification.validator';

const router = express.Router();

router
	.route('/my')
	.get(VerifySession, NotificationListValidator, Controller.getMyNotifications);

router.route('/my/unread-count').get(VerifySession, Controller.getMyUnreadCount);

router.route('/read-all').patch(VerifySession, Controller.markAllRead);

router.route('/:id/read').patch(VerifySession, IDValidator, Controller.markRead);

router
	.route('/')
	.get(VerifySession, VerifyMinLevel('admin'), NotificationAdminListValidator, Controller.getAllForAdmin);

export default router;
