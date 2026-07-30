import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { PaginatedResult } from "@/lib/data";
import { toPaginated } from "@/lib/redux/thunks/paginate";

export type InvoiceType = "booking" | "guide_membership" | "trip_completion";
export type InvoiceStatus = "paid" | "refunded" | "cancelled";

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType | string;
  invoiceDate: string;
  paymentDate?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  customerSnapshot: {
    name: string;
    email: string;
    phone: string;
    country?: string;
  };
  paymentInfo: {
    amount: number;
    grandTotal: number;
    status: string;
    currency: string;
  };
  status: InvoiceStatus | string;
}

export interface InvoiceFilters {
  invoiceType?: InvoiceType;
  status?: InvoiceStatus;
  search?: string;
  page?: number;
}


const handleThunkError = (error: any, rejectWithValue: Function) =>
  rejectWithValue(
    error?.response?.data?.message ||
      error?.message ||
      "An unknown error occurred",
  );

/** Build the querystring, dropping keys the admin left unset. */
const toQuery = (filters: InvoiceFilters = {}) => {
  const query = new URLSearchParams({ limit: "50" });
  if (filters.page) query.set("page", String(filters.page));
  if (filters.invoiceType) query.set("invoiceType", filters.invoiceType);
  if (filters.status) query.set("status", filters.status);
  if (filters.search) query.set("search", filters.search);
  return query.toString();
};

/** Admins get every invoice from this endpoint; other roles get only their own
 *  (the backend narrows the query by caller — see InvoiceService.buildQuery). */
export const fetchInvoices = createAsyncThunk<
  PaginatedResult<Invoice>,
  InvoiceFilters | void,
  { rejectValue: string }
>("invoice/fetchAll", async (filters, { rejectWithValue }) => {
  try {
    const response = await apiService.get<Invoice[]>(`/invoice?${toQuery(filters || {})}`);
    return toPaginated<Invoice>(response);
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

/** Email the invoice to the customer again. */
export const resendInvoice = createAsyncThunk<
  Invoice,
  string,
  { rejectValue: string }
>("invoice/resend", async (invoiceId, { rejectWithValue }) => {
  try {
    const response = await apiService.post<Invoice>(
      `/invoice/${invoiceId}/resend`,
    );
    return response.data as Invoice;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});
