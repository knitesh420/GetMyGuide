import express from 'express';
import IDValidator from '../../middleware/idValidator';
import VerifySession, { VerifyMinLevel } from '../../middleware/VerifySession';
import Controller from './assignment.controller';
import {
	AssignmentCreateValidator,
	AssignmentListQueryValidator,
	AssignmentMyQueryValidator,
	AssignmentReassignValidator,
	AssignmentRespondValidator,
} from './assignment.validator';

const router = express.Router();

router.route('/guides').get(VerifySession, VerifyMinLevel('admin'), Controller.getAssignableGuides);

router
	.route('/my')
	.get(VerifySession, VerifyMinLevel('guide'), AssignmentMyQueryValidator, Controller.getMy);

router
	.route('/')
	.post(VerifySession, VerifyMinLevel('admin'), AssignmentCreateValidator, Controller.createAssignment)
	.get(VerifySession, VerifyMinLevel('admin'), AssignmentListQueryValidator, Controller.getAll);

router
	.route('/:id/respond')
	.patch(VerifySession, VerifyMinLevel('guide'), IDValidator, AssignmentRespondValidator, Controller.respond);

router
	.route('/:id/reassign')
	.post(VerifySession, VerifyMinLevel('admin'), IDValidator, AssignmentReassignValidator, Controller.reassign);

router.route('/:id').get(VerifySession, VerifyMinLevel('guide'), IDValidator, Controller.getById);

export default router;
