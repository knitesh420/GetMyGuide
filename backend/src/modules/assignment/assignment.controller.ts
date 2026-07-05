import AssignmentService from '@services/assignment';
import { NextFunction, Request, Response } from 'express';
import { Respond } from 'node-be-utilities';
import {
	AssignmentCreateValidationResult,
	AssignmentListQueryValidationResult,
	AssignmentMyQueryValidationResult,
	AssignmentReassignValidationResult,
	AssignmentRespondValidationResult,
} from './assignment.validator';

async function createAssignment(req: Request, res: Response, next: NextFunction) {
	try {
		const { bookingId, guideId, adminNotes } = req.locals.data as AssignmentCreateValidationResult;
		const assignment = await AssignmentService.createAssignment({
			bookingId,
			guideId,
			adminNotes,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 201, data: assignment });
	} catch (error) {
		return next(error);
	}
}

async function respond(req: Request, res: Response, next: NextFunction) {
	try {
		const { action, declineReason } = req.locals.data as AssignmentRespondValidationResult;
		const result = await AssignmentService.respond({
			assignmentId: req.locals.id!,
			guideUserId: req.locals.user!.userId,
			action,
			declineReason,
		});

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function reassign(req: Request, res: Response, next: NextFunction) {
	try {
		const { newGuideId, adminNotes } = req.locals.data as AssignmentReassignValidationResult;
		const assignment = await AssignmentService.reassignGuide({
			currentAssignmentId: req.locals.id!,
			newGuideId,
			adminNotes,
			adminUserId: req.locals.user!.userId,
		});

		return Respond({ res, status: 201, data: assignment });
	} catch (error) {
		return next(error);
	}
}

async function getAssignableGuides(req: Request, res: Response, next: NextFunction) {
	try {
		const guides = await AssignmentService.getAssignableGuides();
		return Respond({ res, status: 200, data: guides });
	} catch (error) {
		return next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, status, guideId, bookingId } = req.locals.data as AssignmentListQueryValidationResult;
		const result = await AssignmentService.getAll({ status, guideId, bookingId }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getMy(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, status } = req.locals.data as AssignmentMyQueryValidationResult;
		const result = await AssignmentService.getMy(req.locals.user!.userId, { status }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getById(req: Request, res: Response, next: NextFunction) {
	try {
		const assignment = await AssignmentService.getById(req.locals.id!, req.locals.user!);
		return Respond({ res, status: 200, data: assignment });
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	createAssignment,
	respond,
	reassign,
	getAssignableGuides,
	getAll,
	getMy,
	getById,
};

export default Controller;
