import { createSlice } from "@reduxjs/toolkit";
import { CashPayment } from "@/lib/data";
import {
  CashPaymentSummary,
  fetchGuideCashPayments,
  fetchMyCashPayments,
  recordCashPayment,
  updateCashPayment,
  voidCashPayment,
} from "./thunks/cashPayment/cashPaymentThunks";

interface CashPaymentState {
  payments: CashPayment[];
  summary: CashPaymentSummary;
  loading: boolean;
  /** True while a create/edit/void is in flight, so the form can disable itself. */
  saving: boolean;
  error: string | null;
}

const initialState: CashPaymentState = {
  payments: [],
  summary: { totalAmount: 0, count: 0 },
  loading: false,
  saving: false,
  error: null,
};

/**
 * Manually recorded cash payments. Both the admin's per-guide panel and the
 * guide's own payment history read this slice — they never hold both at once,
 * so one list is enough.
 */
const cashPaymentSlice = createSlice({
  name: "cashPayments",
  initialState,
  reducers: {
    clearCashPaymentError: (state) => {
      state.error = null;
    },
    /** Leaving a guide's page must not leak their records into the next one. */
    clearCashPayments: (state) => {
      state.payments = [];
      state.summary = { totalAmount: 0, count: 0 };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyCashPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyCashPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.data;
        state.summary = action.payload.summary;
      })
      .addCase(fetchMyCashPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Could not load your payment history.";
      })

      .addCase(fetchGuideCashPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGuideCashPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.data;
        state.summary = action.payload.summary;
      })
      .addCase(fetchGuideCashPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Could not load cash payments.";
      })

      .addCase(recordCashPayment.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(recordCashPayment.fulfilled, (state, action) => {
        state.saving = false;
        // Newest first, matching the server's sort — so the row appears where the
        // next refetch will put it anyway.
        state.payments.unshift(action.payload);
        state.summary = {
          totalAmount: state.summary.totalAmount + action.payload.amount,
          count: state.summary.count + 1,
        };
      })
      .addCase(recordCashPayment.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? "Could not record the payment.";
      })

      .addCase(updateCashPayment.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateCashPayment.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.payments.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          const delta = action.payload.amount - state.payments[index].amount;
          state.payments[index] = action.payload;
          state.summary.totalAmount += delta;
        }
      })
      .addCase(updateCashPayment.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? "Could not update the payment.";
      })

      .addCase(voidCashPayment.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(voidCashPayment.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.payments.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          // A void is a soft delete: the row stays on screen for the admin, marked
          // voided, and only drops out of the totals.
          state.payments[index] = action.payload;
          state.summary = {
            totalAmount: state.summary.totalAmount - action.payload.amount,
            count: Math.max(0, state.summary.count - 1),
          };
        }
      })
      .addCase(voidCashPayment.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? "Could not void the payment.";
      });
  },
});

export const { clearCashPaymentError, clearCashPayments } = cashPaymentSlice.actions;
export default cashPaymentSlice.reducer;
