import { createSlice } from "@reduxjs/toolkit";
import {
  Earning,
  EarningSummary,
  Payout,
  PayoutQueueRow,
  fetchAllPayouts,
  fetchMyEarnings,
  fetchMyPayouts,
  fetchPayoutQueue,
  recordPayout,
} from "./thunks/earning/earningThunks";

interface EarningState {
  earnings: Earning[];
  summary: EarningSummary | null;
  payouts: Payout[];
  payoutQueue: PayoutQueueRow[];
  loading: boolean;
  recording: boolean;
  error: string | null;
}

const initialState: EarningState = {
  earnings: [],
  summary: null,
  payouts: [],
  payoutQueue: [],
  loading: false,
  recording: false,
  error: null,
};

const earningSlice = createSlice({
  name: "earning",
  initialState,
  reducers: {
    clearEarningError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyEarnings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyEarnings.fulfilled, (state, action) => {
        state.loading = false;
        state.earnings = action.payload.data;
        state.summary = action.payload.summary;
      })
      .addCase(fetchMyEarnings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load your earnings";
      })

      .addCase(fetchMyPayouts.fulfilled, (state, action) => {
        state.payouts = action.payload.data;
      })
      .addCase(fetchAllPayouts.fulfilled, (state, action) => {
        state.payouts = action.payload.data;
      })

      .addCase(fetchPayoutQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayoutQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.payoutQueue = action.payload;
      })
      .addCase(fetchPayoutQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load the payout queue";
      })

      .addCase(recordPayout.pending, (state) => {
        state.recording = true;
        state.error = null;
      })
      .addCase(recordPayout.fulfilled, (state, action) => {
        state.recording = false;
        state.payouts = [action.payload, ...state.payouts];
        // Drop the settled guide from the queue immediately. Keyed off the
        // request arg, not the response: a freshly created payout has `guide` as
        // a raw id rather than the populated object this row would match on.
        state.payoutQueue = state.payoutQueue.filter(
          (row) => row.guideId !== action.meta.arg.guideId,
        );
      })
      .addCase(recordPayout.rejected, (state, action) => {
        state.recording = false;
        state.error = action.payload ?? "Could not record the payout";
      });
  },
});

export const { clearEarningError } = earningSlice.actions;
export default earningSlice.reducer;
