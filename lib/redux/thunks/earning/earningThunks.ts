import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { PaginatedResult } from "@/lib/data";
import { toPaginated } from "@/lib/redux/thunks/paginate";

const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message =
    error.response?.data?.message || error.message || "An unknown error occurred";
  return rejectWithValue(message);
};

export type EarningStatus = "pending" | "payable" | "paid" | "reversed";

export interface Earning {
  _id: string;
  earningCode: string | null;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  status: EarningStatus;
  payableAt: string;
  createdAt: string;
  booking?: { _id: string; bookingCode?: string; travel_details?: { city: string; date: string } };
  trip?: { _id: string; tripCode?: string; completedAt?: string };
  guide?: { _id: string; name: string; email: string };
}

export interface EarningSummary {
  pendingAmount: number;
  pendingCount: number;
  payableAmount: number;
  payableCount: number;
  paidAmount: number;
  paidCount: number;
  outstandingAmount: number;
  lifetimeAmount: number;
}

export interface Payout {
  _id: string;
  payoutCode: string | null;
  amount: number;
  method: "bank_transfer" | "upi" | "cash" | "other";
  reference: string;
  note?: string;
  paidAt: string;
  guide?: { _id: string; name: string; email: string };
  paidBy?: { _id: string; name: string };
}

/** A guide owed money, as it appears in the admin payout queue. */
export interface PayoutQueueRow {
  guideId: string;
  guideCode: string | null;
  name: string;
  email: string;
  phone: string;
  amount: number;
  earningCount: number;
  earningIds: string[];
  oldestPayableAt: string;
  bankDetails: {
    accountHolderName?: string;
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  } | null;
}

// ---- Guide ----------------------------------------------------------------

export const fetchMyEarnings = createAsyncThunk<
  PaginatedResult<Earning> & { summary: EarningSummary | null },
  { page?: number; status?: EarningStatus } | void,
  { rejectValue: string }
>("earning/fetchMy", async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params && "page" in params && params.page) query.set("page", String(params.page));
    if (params && "status" in params && params.status) query.set("status", params.status);

    const response = await apiService.get<Earning[]>(`/earning/my?${query.toString()}`);
    // The summary sits on the envelope root alongside the page fields, because
    // Respond() spreads whatever the service returned rather than nesting it.
    const { summary } = response as typeof response & { summary?: EarningSummary };

    return { ...toPaginated<Earning>(response), summary: summary ?? null };
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const fetchMyPayouts = createAsyncThunk<
  PaginatedResult<Payout>,
  { page?: number } | void,
  { rejectValue: string }
>("earning/fetchMyPayouts", async (params, { rejectWithValue }) => {
  try {
    const page = params && "page" in params ? (params.page ?? 1) : 1;
    const response = await apiService.get<Payout[]>(`/earning/my/payouts?page=${page}`);
    return toPaginated<Payout>(response);
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

// ---- Admin ----------------------------------------------------------------

export const fetchPayoutQueue = createAsyncThunk<PayoutQueueRow[], void, { rejectValue: string }>(
  "earning/fetchPayoutQueue",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<PayoutQueueRow[]>("/earning/payout-queue");
      return (response.data ?? []) as PayoutQueueRow[];
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

/**
 * Records a transfer the admin has already made by hand. This moves no money —
 * the `reference` is the proof (a bank UTR, a UPI txn id) that it happened.
 */
export const recordPayout = createAsyncThunk<
  Payout,
  {
    guideId: string;
    earningIds: string[];
    method: "bank_transfer" | "upi" | "cash" | "other";
    reference: string;
    note?: string;
  },
  { rejectValue: string }
>("earning/recordPayout", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiService.post<Payout>("/earning/payouts", payload);
    return response.data as Payout;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const fetchAllPayouts = createAsyncThunk<
  PaginatedResult<Payout>,
  { page?: number } | void,
  { rejectValue: string }
>("earning/fetchAllPayouts", async (params, { rejectWithValue }) => {
  try {
    const page = params && "page" in params ? (params.page ?? 1) : 1;
    const response = await apiService.get<Payout[]>(`/earning/payouts?page=${page}`);
    return toPaginated<Payout>(response);
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});
