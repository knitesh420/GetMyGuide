import { createSlice } from "@reduxjs/toolkit";
import {
  FailedPayment,
  fetchFailedPayments,
} from "@/lib/redux/thunks/payment/failedPaymentThunks";

interface FailedPaymentState {
  payments: FailedPayment[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

const initialState: FailedPaymentState = {
  payments: [],
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  error: null,
};

const failedPaymentSlice = createSlice({
  name: "failedPayments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFailedPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFailedPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload?.data ?? [];
        state.total = action.payload?.total ?? 0;
        state.page = action.payload?.page ?? 1;
        state.totalPages = action.payload?.totalPages ?? 1;
      })
      .addCase(fetchFailedPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load failed payments";
      });
  },
});

export default failedPaymentSlice.reducer;
