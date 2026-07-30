import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GuideReview } from "@/lib/data";
import {
  createReview,
  deleteReview,
  fetchAllReviewsForAdmin,
  fetchMineAsGuide,
  fetchMyReviews,
  fetchPublicGuideReviews,
  toggleHideReview,
} from "@/lib/redux/thunks/review/reviewThunks";

interface ReviewState {
  myReviews: GuideReview[];
  guideReviews: GuideReview[];
  guideRatingSummary: { average: number; total: number };
  adminReviews: GuideReview[];
  publicGuideReviews: GuideReview[];
  publicRatingSummary: { average: number; total: number };
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; totalPages: number };
}

const initialState: ReviewState = {
  myReviews: [],
  guideReviews: [],
  guideRatingSummary: { average: 0, total: 0 },
  adminReviews: [],
  publicGuideReviews: [],
  publicRatingSummary: { average: 0, total: 0 },
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, totalPages: 0 },
};

const reviewSlice = createSlice({
  name: "review",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading = false;
        state.myReviews = [action.payload, ...state.myReviews];
      })
      .addCase(fetchPublicGuideReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.publicGuideReviews = action.payload.reviews;
        state.publicRatingSummary = { average: action.payload.average, total: action.payload.total };
      })
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.myReviews = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchMineAsGuide.fulfilled, (state, action) => {
        state.loading = false;
        state.guideReviews = action.payload.data;
        state.guideRatingSummary = { average: action.payload.average, total: action.payload.ratingTotal };
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchAllReviewsForAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.adminReviews = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(toggleHideReview.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.adminReviews.findIndex((r) => r._id === action.payload._id);
        if (index !== -1) state.adminReviews[index] = action.payload;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading = false;
        state.adminReviews = state.adminReviews.filter((r) => r._id !== action.payload);
      })
      .addMatcher(
        (action) => action.type.startsWith("review/") && action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action): action is PayloadAction<string> =>
          action.type.startsWith("review/") && action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        },
      );
  },
});

export default reviewSlice.reducer;
