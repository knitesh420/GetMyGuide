import GuideService from '@services/guide';

import { respond } from '@/server/http/respond';
import type { RouteHandler } from '@/server/http/route';

/**
 * Guide handlers shared by more than one route path.
 *
 * `/guide/all` and `/guide/all-guides` are aliases the frontend calls both
 * spellings of. The Express router pointed both at one controller function
 * specifically so they could not drift apart; defining the handler once here
 * keeps that property.
 */
export const getAllApprovedGuidesHandler: RouteHandler = async (request) => {
	const params = new URL(request.url).searchParams;

	const page = params.get('page');
	const limit = params.get('limit');

	const result = await GuideService.getAllApprovedGuides({
		location: params.get('location') ?? undefined,
		language: params.get('language') ?? undefined,
		page: page ? parseInt(page, 10) : undefined,
		limit: limit ? parseInt(limit, 10) : undefined,
		search: params.get('search') ?? undefined,
	});

	return respond({
		status: 200,
		data: {
			data: result.data,
			total: result.total,
			page: result.page,
			totalPages: result.totalPages,
		},
	});
};
