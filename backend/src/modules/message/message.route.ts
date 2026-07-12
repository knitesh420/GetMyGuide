import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession from '../../middleware/VerifySession';
import Controller from './message.controller';
import {
	MessageSendValidator,
	MessageThreadListQueryValidator,
	MessageThreadQueryValidator,
} from './message.validator';

const router = express.Router();

// Literal paths first — '/threads' and '/unread-count' must not be eaten by the
// '/booking/:id' matcher below.
router
	.route('/threads')
	.get(VerifySession, MessageThreadListQueryValidator, Controller.getThreads);

router.route('/unread-count').get(VerifySession, Controller.getUnreadCount);

// Every thread is scoped to a booking; the service authorises the caller against
// that booking (its tourist, its allocated guide, or an admin).
router
	.route('/booking/:id')
	.get(VerifySession, IDValidator, MessageThreadQueryValidator, Controller.getThread)
	.post(VerifySession, IDValidator, MessageSendValidator, Controller.send);

router.route('/booking/:id/read').patch(VerifySession, IDValidator, Controller.markRead);

export default router;
