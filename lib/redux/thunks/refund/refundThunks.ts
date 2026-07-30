import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { PaginatedResult } from "@/lib/data";
import { toPaginated } from "@/lib/redux/thunks/paginate";

const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message =
    error.response?.data?.message || error.message || "An unknown error occurred";
  return rejectWithValue(message);
};

export type RefundStatus = "pending" | "processed" | "rejected" | "failed";

export interface RefundLeg {
  razorpay_payment_id: string;
  razorpay_refund_id?: string;
  amount: number;
  status: "pending" | "processed" | "failed";
  failureReason?: string;
}

export interface RefundRequest {
  _id: string;
  refundCode: string | null;
  reason: string;
  status: RefundStatus;
  /** What the tourist had actually paid. The refund can never exceed this. */
  amountPaid: number;
  approvedAmount?: number;
  adminNote?: string;
  refunds: RefundLeg[];
  processedAt?: string;
  createdAt: string;
  booking?: {
    _id: string;
    bookingCode?: string;
    status: string;
    tourist_info?: { name: string; email: string; phone: string };
    travel_details?: { city: string; date: string };
    booking_configuration?: { price: number };
  };
  requestedBy?: { _id: string; name: string; email: string; role: string };
  processedBy?: { _id: string; name: string };
}

/** Open a cancellation request. Nothing is cancelled until an admin decides. */
export const requestCancellation = createAsyncThunk<
  RefundRequest,
  { bookingId: string; reason: string },
  { rejectValue: string }
>("refund/request", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiService.post<RefundRequest>("/refund/request", payload);
    return response.data as RefundRequest;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const fetchMyRefunds = createAsyncThunk<
  PaginatedResult<RefundRequest>,
  { page?: number } | void,
  { rejectValue: string }
>("refund/fetchMy", async (params, { rejectWithValue }) => {
  try {
    const page = params && "page" in params ? (params.page ?? 1) : 1;
    const response = await apiService.get<RefundRequest[]>(`/refund/my?page=${page}`);
    return toPaginated<RefundRequest>(response);
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

// ---- Admin queue ----------------------------------------------------------

export const fetchRefunds = createAsyncThunk<
  PaginatedResult<RefundRequest>,
  { page?: number; status?: RefundStatus } | void,
  { rejectValue: string }
>("refund/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params && "page" in params && params.page) query.set("page", String(params.page));
    if (params && "status" in params && params.status) query.set("status", params.status);

    const response = await apiService.get<RefundRequest[]>(`/refund?${query.toString()}`);
    return toPaginated<RefundRequest>(response);
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

/**
 * Approve: cancels the booking and pushes the refund to Razorpay. An
 * `approvedAmount` of 0 is legitimate — cancel the booking, refund nothing.
 */
export const approveRefund = createAsyncThunk<
  RefundRequest,
  { refundId: string; approvedAmount: number; adminNote?: string },
  { rejectValue: string }
>("refund/approve", async ({ refundId, ...payload }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<RefundRequest>(
      `/refund/${refundId}/approve`,
      payload,
    );
    return response.data as RefundRequest;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const rejectRefund = createAsyncThunk<
  RefundRequest,
  { refundId: string; adminNote: string },
  { rejectValue: string }
>("refund/reject", async ({ refundId, adminNote }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<RefundRequest>(`/refund/${refundId}/reject`, {
      adminNote,
    });
    return response.data as RefundRequest;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

/** Re-attempt only the Razorpay legs that failed. Never double-pays a good leg. */
export const retryRefund = createAsyncThunk<RefundRequest, string, { rejectValue: string }>(
  "refund/retry",
  async (refundId, { rejectWithValue }) => {
    try {
      const response = await apiService.post<RefundRequest>(`/refund/${refundId}/retry`);
      return response.data as RefundRequest;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);
