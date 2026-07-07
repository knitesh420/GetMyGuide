import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService, publicApiService } from "@/lib/service/api";
import { GuideReview, PaginatedResult } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

export const createReview = createAsyncThunk<
  GuideReview,
  { bookingId: string; rating: number; comment?: string }
>("review/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiService.post<GuideReview>("/review", payload);
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchPublicGuideReviews = createAsyncThunk<
  { reviews: GuideReview[]; average: number; total: number },
  string
>("review/fetchPublicGuideReviews", async (guideId, { rejectWithValue }) => {
  try {
    const response = await publicApiService.get<{
      reviews: GuideReview[];
      average: number;
      total: number;
    }>(`/review/guide/${guideId}`);
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyReviews = createAsyncThunk<
  PaginatedResult<GuideReview>,
  { page?: number; limit?: number } | undefined
>("review/fetchMy", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<GuideReview>>("/review/my", { params });
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMineAsGuide = createAsyncThunk<
  PaginatedResult<GuideReview> & { average: number; ratingTotal: number },
  { page?: number; limit?: number } | undefined
>("review/fetchMineAsGuide", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<
      PaginatedResult<GuideReview> & { average: number; ratingTotal: number }
    >("/review/mine/guide", { params });
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchAllReviewsForAdmin = createAsyncThunk<
  PaginatedResult<GuideReview>,
  { guideId?: string; minRating?: number; isHidden?: boolean; page?: number; limit?: number } | undefined
>("review/fetchAllForAdmin", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<GuideReview>>("/review", { params });
    return response.data!;
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
    return response.data!;
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
