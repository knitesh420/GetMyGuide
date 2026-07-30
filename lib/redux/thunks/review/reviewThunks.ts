import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService, publicApiService } from "@/lib/service/api";
import { toPaginated } from "@/lib/redux/thunks/paginate";
import { GuideReview, PaginatedResult } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

export const createReview = createAsyncThunk<
  GuideReview,
  { bookingId: string; rating: number; comment?: string }
>("review/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiService.post<GuideReview>("/review", payload);
    // A single object is spread onto the top level, so the created review is
    // the response body itself (not response.data).
    return response as unknown as GuideReview;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchPublicGuideReviews = createAsyncThunk<
  { reviews: GuideReview[]; average: number; total: number },
  string
>("review/fetchPublicGuideReviews", async (guideId, { rejectWithValue }) => {
  try {
    const response = await publicApiService.get<GuideReview[]>(
      `/review/guide/${guideId}`,
    );
    const body = response as unknown as {
      reviews?: GuideReview[];
      average?: number;
      total?: number;
    };
    return {
      reviews: body.reviews ?? [],
      average: body.average ?? 0,
      total: body.total ?? 0,
    };
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyReviews = createAsyncThunk<
  PaginatedResult<GuideReview>,
  { page?: number; limit?: number } | undefined
>("review/fetchMy", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<GuideReview[]>("/review/my", { params });
    return toPaginated<GuideReview>(response);
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMineAsGuide = createAsyncThunk<
  PaginatedResult<GuideReview> & { average: number; ratingTotal: number },
  { page?: number; limit?: number } | undefined
>("review/fetchMineAsGuide", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<GuideReview[]>("/review/mine/guide", {
      params,
    });
    const extra = response as unknown as {
      average?: number;
      ratingTotal?: number;
    };
    return {
      ...toPaginated<GuideReview>(response),
      average: extra.average ?? 0,
      ratingTotal: extra.ratingTotal ?? 0,
    };
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchAllReviewsForAdmin = createAsyncThunk<
  PaginatedResult<GuideReview>,
  { guideId?: string; minRating?: number; isHidden?: boolean; page?: number; limit?: number } | undefined
>("review/fetchAllForAdmin", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<GuideReview[]>("/review", { params });
    return toPaginated<GuideReview>(response);
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const toggleHideReview = createAsyncThunk<
  GuideReview,
  { id: string; isHidden: boolean }
>("review/toggleHide", async ({ id, isHidden }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<GuideReview>(`/review/${id}/hide`, { isHidden });
    return response as unknown as GuideReview;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const deleteReview = createAsyncThunk<string, string>(
  "review/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiService.delete(`/review/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);
