import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { CashPayment, PaginatedResult } from "@/lib/data";
import { toPaginated } from "@/lib/redux/thunks/paginate";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

export interface CashPaymentSummary {
  totalAmount: number;
  count: number;
}

export interface CashPaymentInput {
  amount: number;
  /** ISO date string (yyyy-mm-dd is fine — the backend coerces it). */
  paymentDate: string;
  paidBy: "tourist" | "admin";
  touristName?: string;
  bookingReference?: string;
  remarks?: string;
}

type CashPaymentPage = PaginatedResult<CashPayment> & { summary: CashPaymentSummary };

/**
 * The guide's own payment history: GET /cash-payment/my.
 *
 * Voided records are filtered out server-side, and the audit fields (who
 * recorded it, who edited it) are never sent — a guide sees the money, not the
 * back-office trail.
 */
export const fetchMyCashPayments = createAsyncThunk<
  CashPaymentPage,
  { page?: number } | void,
  { rejectValue: string }
>("cashPayment/fetchMy", async (params, { rejectWithValue }) => {
  try {
    const page = params && "page" in params ? (params.page ?? 1) : 1;
    const response = await apiService.get<CashPayment[]>(`/cash-payment/my?page=${page}`);
    const { summary } = response as typeof response & { summary?: CashPaymentSummary };

    return {
      ...toPaginated<CashPayment>(response),
      summary: summary ?? { totalAmount: 0, count: 0 },
    };
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

/** Admin: every cash record for one guide, voided ones included. */
export const fetchGuideCashPayments = createAsyncThunk<
  CashPaymentPage,
  { guideAccountId: string; page?: number },
  { rejectValue: string }
>("cashPayment/fetchForGuide", async ({ guideAccountId, page = 1 }, { rejectWithValue }) => {
  try {
    const response = await apiService.get<CashPayment[]>(
      `/cash-payment/guide/${guideAccountId}?page=${page}&limit=100`,
    );
    const { summary } = response as typeof response & { summary?: CashPaymentSummary };

    return {
      ...toPaginated<CashPayment>(response),
      summary: summary ?? { totalAmount: 0, count: 0 },
    };
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

/**
 * Admin: record cash a guide was handed. `recordedBy` is NOT sent — the backend
 * fills it from the admin's session, so the audit trail cannot be forged.
 */
export const recordCashPayment = createAsyncThunk<
  CashPayment,
  { guideId: string } & CashPaymentInput,
  { rejectValue: string }
>("cashPayment/record", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiService.post<CashPayment>("/cash-payment", payload);
    return response.data as CashPayment;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const updateCashPayment = createAsyncThunk<
  CashPayment,
  { paymentId: string } & Partial<CashPaymentInput>,
  { rejectValue: string }
>("cashPayment/update", async ({ paymentId, ...data }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<CashPayment>(`/cash-payment/${paymentId}`, data);
    return response.data as CashPayment;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

/**
 * Admin: void a record. This is a soft delete — the row stays in the database
 * and stays visible to admins, but drops out of the guide's payment history.
 */
export const voidCashPayment = createAsyncThunk<
  CashPayment,
  { paymentId: string; reason?: string },
  { rejectValue: string }
>("cashPayment/void", async ({ paymentId, reason }, { rejectWithValue }) => {
  try {
    const response = await apiService.delete<CashPayment>(`/cash-payment/${paymentId}`, {
      data: { reason },
    });
    return response.data as CashPayment;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});
