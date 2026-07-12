import { createSlice } from "@reduxjs/toolkit";
import {
  RefundRequest,
  approveRefund,
  fetchMyRefunds,
  fetchRefunds,
  rejectRefund,
  requestCancellation,
  retryRefund,
} from "./thunks/refund/refundThunks";

interface RefundState {
  requests: RefundRequest[];
  myRequests: RefundRequest[];
  loading: boolean;
  /** True while an approve/reject/retry is in flight — disables the row's buttons. */
  deciding: boolean;
  error: string | null;
}

const initialState: RefundState = {
  requests: [],
  myRequests: [],
  loading: false,
  deciding: false,
  error: null,
};

/** Swap a decided request in place so the queue reflects the outcome at once. */
function replace(list: RefundRequest[], updated: RefundRequest): RefundRequest[] {
  return list.map((item) => (item._id === updated._id ? { ...item, ...updated } : item));
}

const refundSlice = createSlice({
  name: "refund",
  initialState,
  reducers: {
    clearRefundError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRefunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRefunds.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload.data;
      })
      .addCase(fetchRefunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load refund requests";
      })

      .addCase(fetchMyRefunds.fulfilled, (state, action) => {
        state.myRequests = action.payload.data;
      })

      .addCase(requestCancellation.pending, (state) => {
        state.deciding = true;
        state.error = null;
      })
      .addCase(requestCancellation.fulfilled, (state, action) => {
        state.deciding = false;
        state.myRequests = [action.payload, ...state.myRequests];
      })
      .addCase(requestCancellation.rejected, (state, action) => {
        state.deciding = false;
        state.error = action.payload ?? "Could not submit your cancellation request";
      })

      .addCase(approveRefund.pending, (state) => {
        state.deciding = true;
        state.error = null;
      })
      .addCase(approveRefund.fulfilled, (state, action) => {
        state.deciding = false;
        state.requests = replace(state.requests, action.payload);
      })
      .addCase(approveRefund.rejected, (state, action) => {
        state.deciding = false;
        state.error = action.payload ?? "Could not approve the refund";
      })

      .addCase(rejectRefund.pending, (state) => {
        state.deciding = true;
        state.error = null;
      })
      .addCase(rejectRefund.fulfilled, (state, action) => {
        state.deciding = false;
        state.requests = replace(state.requests, action.payload);
      })
      .addCase(rejectRefund.rejected, (state, action) => {
        state.deciding = false;
        state.error = action.payload ?? "Could not decline the request";
      })

      .addCase(retryRefund.pending, (state) => {
        state.deciding = true;
        state.error = null;
      })
      .addCase(retryRefund.fulfilled, (state, action) => {
        state.deciding = false;
        state.requests = replace(state.requests, action.payload);
      })
      .addCase(retryRefund.rejected, (state, action) => {
        state.deciding = false;
        state.error = action.payload ?? "The refund failed again";
      });
  },
});

export const { clearRefundError } = refundSlice.actions;
export default refundSlice.reducer;
