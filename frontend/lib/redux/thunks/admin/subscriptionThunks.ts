// store/thunks/admin/subscriptionThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/lib/service/api';
import { SubscriptionPlan, CreateSubscriptionPlan } from '@/types/admin';
import { GuideProfile } from '@/lib/data'; // Assuming you have a guide type definition

const API_BASE_URL = '/api/subscriptions';

// --- Interfaces for Admin Operations ---

interface SubscriptionListResponse {
  success: boolean;
  count: number;
  data: SubscriptionPlan[];
}

interface SubscriptionSingleResponse {
  success: boolean;
  message?: string;
  data: SubscriptionPlan;
}

// --- Interfaces for Payment Flow ---

interface CreateOrderResponse {
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  key_id: string;
}

interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: string;
}


// ====================================================================
// --- Subscription Thunks (for Admin Panel) ---
// ====================================================================

/**
 * Fetches all subscription plans from the server. (For Admin & Public)
 */
export const fetchSubscriptions = createAsyncThunk<SubscriptionPlan[]>(
  'subscriptions/fetchAll', // Renamed for clarity
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<SubscriptionListResponse>(API_BASE_URL);
      return response.data || [];
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch subscription plans';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Adds a new subscription plan. (Admin Only)
 */
export const addSubscription = createAsyncThunk<SubscriptionPlan, CreateSubscriptionPlan>(
  'subscriptions/add', // Renamed for clarity
  async (planData, { rejectWithValue }) => {
    try {
      const response = await apiService.post<SubscriptionSingleResponse>(API_BASE_URL, planData);
      const newPlan = response.data;
      if (newPlan) {
        return newPlan;
      } else {
        return rejectWithValue('Failed to create subscription: Invalid response from server.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add subscription plan';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Updates an existing subscription plan. (Admin Only)
 */
export const updateSubscription = createAsyncThunk<SubscriptionPlan, SubscriptionPlan>(
  'subscriptions/update', // Renamed for clarity
  async (planData, { rejectWithValue }) => {
    try {
      const { _id, ...updateData } = planData;
      const response = await apiService.put<SubscriptionSingleResponse>(`${API_BASE_URL}/${_id}`, updateData);
      const updatedPlan = response.data;
      if (updatedPlan) {
        return updatedPlan;
      } else {
        return rejectWithValue('Failed to update subscription: Invalid response from server.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update subscription plan';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Deletes a subscription plan. (Admin Only)
 */
export const deleteSubscription = createAsyncThunk<string, string>(
  'subscriptions/delete', // Renamed for clarity
  async (planId, { rejectWithValue }) => {
    try {
      await apiService.delete(`${API_BASE_URL}/${planId}`);
      return planId;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete subscription plan';
      return rejectWithValue(errorMessage);
    }
  }
);


// ====================================================================
// --- Payment Thunks (for Guides) ---
// These are now integrated into the same file.
// ====================================================================

/**
 * Creates a Razorpay payment order for a selected subscription plan.
 */
export const createPaymentOrder = createAsyncThunk<CreateOrderResponse, string>(
  'subscriptions/createOrder', // Thunk name
  async (planId, { rejectWithValue }) => {
    try {
      // The API endpoint is now under /api/subscriptions/
      const response = await apiService.post<CreateOrderResponse>(`${API_BASE_URL}/create-order`, { planId });
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create payment order');
    }
  }
);

/**
 * Verifies a Razorpay payment and updates the guide's certified status.
 */
export const verifyPayment = createAsyncThunk<GuideProfile, VerifyPaymentPayload>(
  'subscriptions/verifyPayment', // Thunk name
  async (payload, { rejectWithValue }) => {
    try {
      // The API endpoint is now under /api/subscriptions/
      const response = await apiService.post<{ guide: GuideProfile }>(`${API_BASE_URL}/verify-payment`, payload);
      return response.data!.guide;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Payment verification failed');
    }
  }
);