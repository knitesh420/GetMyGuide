import { createSlice } from "@reduxjs/toolkit";
import {
  Invoice,
  fetchInvoices,
  resendInvoice,
} from "@/lib/redux/thunks/invoice/invoiceThunks";

interface InvoiceState {
  invoices: Invoice[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  /** True only while a resend is in flight, so the list doesn't flash a skeleton. */
  resending: boolean;
  error: string | null;
}

const initialState: InvoiceState = {
  invoices: [],
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  resending: false,
  error: null,
};

const invoiceSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload?.data ?? [];
        state.total = action.payload?.total ?? 0;
        state.page = action.payload?.page ?? 1;
        state.totalPages = action.payload?.totalPages ?? 1;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load payments";
      })

      .addCase(resendInvoice.pending, (state) => {
        state.resending = true;
      })
      .addCase(resendInvoice.fulfilled, (state) => {
        state.resending = false;
      })
      .addCase(resendInvoice.rejected, (state, action) => {
        state.resending = false;
        state.error = action.payload ?? "Could not resend the invoice";
      });
  },
});

export default invoiceSlice.reducer;
