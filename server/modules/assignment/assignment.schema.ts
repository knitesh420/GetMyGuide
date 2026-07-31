import { z } from 'zod';

/**
 * Zod schemas for the assignment module.
 *
 * Extracted from assignment.validator.ts so the Express middleware and the
 * native Route Handlers share one definition. Rules and messages unchanged.
 *
 * The two `.refine()` rules are the interesting part: an override of an
 * availability conflict, and a decline, both REQUIRE a written reason. Those
 * reasons end up in the audit trail and in what the other party is told, so
 * dropping either rule would quietly allow unexplained reassignments.
 */

export const assignmentCreateSchema = z
	.object({
		bookingId: z.string().trim().min(1, 'Booking ID is required'),
		guideId: z.string().trim().min(1, 'Guide ID is required'),
		adminNotes: z.string().trim().optional(),
		override: z.boolean().optional(),
		overrideReason: z.string().trim().optional(),
	})
	.refine((data) => !data.override || !!data.overrideReason, {
		message: 'A reason is required to override an availability conflict',
		path: ['overrideReason'],
	});

export const assignmentRespondSchema = z
	.object({
		action: z.enum(['accept', 'decline'], { message: 'Action must be accept or decline' }),
		declineReason: z.string().trim().min(1).optional(),
	})
	.refine((data) => data.action !== 'decline' || !!data.declineReason, {
		message: 'A reason is required to decline an assignment',
		path: ['declineReason'],
	});

export const assignmentReassignSchema = z
	.object({
		newGuideId: z.string().trim().min(1, 'New guide ID is required'),
		adminNotes: z.string().trim().optional(),
		override: z.boolean().optional(),
		overrideReason: z.string().trim().optional(),
	})
	.refine((data) => !data.override || !!data.overrideReason, {
		message: 'A reason is required to override an availability conflict',
		path: ['overrideReason'],
	});

export const assignmentListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(['pending', 'accepted', 'declined', 'reassigned']).optional(),
	guideId: z.string().trim().optional(),
	bookingId: z.string().trim().optional(),
});

export const assignmentMyQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(['pending', 'accepted', 'declined', 'reassigned']).optional(),
});
