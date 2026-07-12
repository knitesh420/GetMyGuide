import DashboardService from '@services/dashboard';
import express, { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import VerifySession from '../../middleware/VerifySession';

const router = express.Router();

/**
 * Role-aware summary tiles. The frontend calls this from a shared hook without
 * knowing the caller's role — the shape is chosen server-side from the session.
 */
router.route('/stats').get(VerifySession, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const stats = await DashboardService.getStats(req.locals.user!);
		return Respond({ res, status: 200, data: stats });
	} catch (error) {
		return next(error);
	}
});

export default router;
