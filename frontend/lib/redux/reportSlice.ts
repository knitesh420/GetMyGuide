import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActivityLogEntry, BookingsTrendPoint, GuidePerformanceRow, ReportOverview } from "@/lib/data";
import {
  fetchActivityLog,
  fetchBookingsTrend,
  fetchGuidePerformance,
  fetchReportOverview,
} from "@/lib/redux/thunks/report/reportThunks";

interface ReportState {
  overview: ReportOverview | null;
  bookingsTrend: BookingsTrendPoint[];
  guidePerformance: GuidePerformanceRow[];
  activityLog: ActivityLogEntry[];
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; totalPages: number };
}

const initialState: ReportState = {
  overview: null,
  bookingsTrend: [],
  guidePerformance: [],
  activityLog: [],
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, totalPages: 0 },
};

const reportSlice = createSlice({
  name: "report",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload;
      })
      .addCase(fetchBookingsTrend.fulfilled, (state, action) => {
        state.loading = false;
        state.bookingsTrend = action.payload;
      })
      .addCase(fetchGuidePerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.guidePerformance = action.payload;
      })
      .addCase(fetchActivityLog.fulfilled, (state, action) => {
        state.loading = false;
        state.activityLog = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addMatcher(
        (action) => action.type.startsWith("report/") && action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action): action is PayloadAction<string> =>
          action.type.startsWith("report/") && action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        },
      );
  },
});

export default reportSlice.reducer;
