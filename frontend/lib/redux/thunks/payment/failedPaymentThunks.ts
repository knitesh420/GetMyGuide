import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { PaginatedResult } from "@/lib/data";
import { toPaginated } from "@/lib/redux/thunks/paginate";

/**
 * `failed` is the gateway's verdict — the card was declined, the UPI mandate
 * lapsed, the customer walked away mid-flow. `pending_verification` means the
 * money moved but our own follow-up bookkeeping was abandoned, which is the
 * more urgent of the two.
 */
export type FailedPaymentStatus = "failed" | "pending_verification";

export interface FailedPayment {
  _id: string;
  paymentCode: string | null;
  transaction_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  referenceType: string;
  type: string;
  status: FailedPaymentStatus | string;
  amount: number;
  currency: string;
  /** Absent on rows written before the transaction carried a payer snapshot. */
  customer: { name?: string; email?: string; phone?: string } | null;
  /** Razorpay's stated reason. Null when the gateway told us nothing. */
  failure: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    method?: string;
    at?: string;
  } | null;
  attemptedAt: string;
  updatedAt: string;
}

export interface FailedPaymentFilters {
  status?: FailedPaymentStatus;
  referenceType?: string;
  search?: string;
  page?: number;
}

const errorMessage = (error: unknown): string => {
  const shaped = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return (
    shaped?.response?.data?.message ||
    shaped?.message ||
    "An unknown error occurred"
  );
};

/** Build the querystring, dropping keys the admin left unset. */
const toQuery = (filters: FailedPaymentFilters = {}) => {
  const query = new URLSearchParams({ limit: "50" });
  if (filters.page) query.set("page", String(filters.page));
  if (filters.status) query.set("status", filters.status);
  if (filters.referenceType) query.set("referenceType", filters.referenceType);
  if (filters.search) query.set("search", filters.search);
  return query.toString();
};

/** Admin-only — the rows carry customer contact details. */
export const fetchFailedPayments = createAsyncThunk<
  PaginatedResult<FailedPayment>,
  FailedPaymentFilters | void,
  { rejectValue: string }
>("payment/fetchFailed", async (filters, { rejectWithValue }) => {
  try {
    const response = await apiService.get<FailedPayment[]>(
      `/payment/admin/failed?${toQuery(filters || {})}`,
    );
    return toPaginated<FailedPayment>(response);
  } catch (error: unknown) {
    return rejectWithValue(errorMessage(error));
  }
});
