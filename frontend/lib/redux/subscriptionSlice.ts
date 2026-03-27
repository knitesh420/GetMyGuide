// store/slices/admin/subscriptionSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SubscriptionPlan } from '@/types/admin';
import {
  fetchSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
} from './thunks/admin/subscriptionThunks';

interface SubscriptionState {
  plans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  plans: [],
  loading: false,
  error: null,
};

const subscriptionSlice = createSlice({
  name: 'subscriptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- Fetch Subscriptions ---
      .addCase(fetchSubscriptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action: PayloadAction<SubscriptionPlan[]>) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // --- Add Subscription ---
      .addCase(addSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSubscription.fulfilled, (state, action: PayloadAction<SubscriptionPlan>) => {
        state.plans.push(action.payload);
        state.plans.sort((a, b) => a.totalPrice - b.totalPrice);
        state.loading = false;
      })
      .addCase(addSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // --- Update Subscription ---
      .addCase(updateSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSubscription.fulfilled, (state, action: PayloadAction<SubscriptionPlan>) => {
        const index = state.plans.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.plans[index] = action.payload;
        }
        state.plans.sort((a, b) => a.totalPrice - b.totalPrice);
        state.loading = false;
      })
      .addCase(updateSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // --- Delete Subscription ---
      .addCase(deleteSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSubscription.fulfilled, (state, action: PayloadAction<string>) => {
        state.plans = state.plans.filter((p) => p._id !== action.payload);
        state.loading = false;
      })
      .addCase(deleteSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default subscriptionSlice.reducer;