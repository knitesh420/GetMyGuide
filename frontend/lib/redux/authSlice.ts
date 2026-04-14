// lib/redux/authSlice.ts
//
// Auth tokens live ONLY in HTTP-only cookies (set by the backend). We
// deliberately avoid localStorage / sessionStorage / window globals for
// tokens — those are shared across the whole window and aren't readable from
// SSR, which is exactly what caused the "one admin logs in, everyone is
// logged in" bug. The Redux store here keeps only display state (the user
// object), and the source of truth for "am I logged in" is always a
// fresh /session/validate-auth round-trip.
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "../service/api";
import {
  AuthState,
  LoginRequest,
  OTPRequest,
  OtpLoginRequest,
  User,
  AuthResponse,
} from "@/types/auth";

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: null, // null = unknown until validate-auth resolves
  loading: false,
  error: null,
};

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// Login
export const loginUser = createAsyncThunk<AuthResponse, LoginRequest>(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/session/login", credentials);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Register/Signup
export const registerUser = createAsyncThunk<AuthResponse, any>(
  "auth/registerUser",
  async (data, { rejectWithValue }) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.mobile || data.phone,
        password: data.password,
      };
      const result = await apiService.post("/session/signup", payload);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Send OTP for admin login
export const sendLoginOtp = createAsyncThunk<any, { email: string }>(
  "auth/sendLoginOtp",
  async (data, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/session/login/send-otp", data);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Verify OTP and login admin
export const loginWithOtp = createAsyncThunk<AuthResponse, OtpLoginRequest>(
  "auth/loginWithOtp",
  async (data, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/session/login/verify-otp", data);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const sendOTP = createAsyncThunk<AuthResponse, OTPRequest>(
  "auth/sendOTP",
  async (data, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/auth/send-otp", data);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const verifyOtpAndRegister = createAsyncThunk<AuthResponse, FormData>(
  "auth/verifyOtpAndRegister",
  async (formData, { rejectWithValue }) => {
    try {
      const payload = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("mobile") as string,
        password: formData.get("password") as string,
      };
      const result = await apiService.post("/session/signup", payload);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Get current user
export const getCurrentUser = createAsyncThunk<AuthResponse>(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiService.get("/session/validate-auth");
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Refresh token (cookie-based; body is ignored)
export const refreshToken = createAsyncThunk<AuthResponse>(
  "auth/refreshToken",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/session/refresh");
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Logout
export const logoutUser = createAsyncThunk<void, void>(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await apiService.post("/session/logout");
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

const setUserFromResponse = (state: AuthState, payload: AuthResponse) => {
  const userData =
    (payload as any).user ?? (payload as any).data?.user ?? null;
  if (userData && userData.phone) {
    userData.mobile = userData.phone;
  }
  state.user = userData;
  state.isAuthenticated = !!userData;
  state.token = null; // Tokens never live in client memory anymore
  state.error = null;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setAuthState: (
      state,
      action: PayloadAction<{ user: User; isAuthenticated: boolean }>,
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = action.payload.isAuthenticated;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const setPending = (state: AuthState) => {
      state.loading = true;
      state.error = null;
    };
    const setRejected = (state: AuthState, action: any) => {
      state.loading = false;
      state.error = action.payload as string;
    };
    const setFulfilled = (
      state: AuthState,
      action: { payload: AuthResponse },
    ) => {
      state.loading = false;
      setUserFromResponse(state, action.payload);
    };

    builder
      .addCase(loginUser.pending, setPending)
      .addCase(loginUser.fulfilled, setFulfilled)
      .addCase(loginUser.rejected, setRejected);

    builder
      .addCase(registerUser.pending, setPending)
      .addCase(registerUser.fulfilled, setFulfilled)
      .addCase(registerUser.rejected, setRejected);

    builder
      .addCase(sendLoginOtp.pending, setPending)
      .addCase(sendLoginOtp.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(sendLoginOtp.rejected, setRejected);

    builder
      .addCase(loginWithOtp.pending, setPending)
      .addCase(loginWithOtp.fulfilled, setFulfilled)
      .addCase(loginWithOtp.rejected, setRejected);

    builder
      .addCase(sendOTP.pending, setPending)
      .addCase(sendOTP.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(sendOTP.rejected, setRejected);

    builder
      .addCase(verifyOtpAndRegister.pending, setPending)
      .addCase(verifyOtpAndRegister.fulfilled, setFulfilled)
      .addCase(verifyOtpAndRegister.rejected, setRejected);

    builder
      .addCase(getCurrentUser.pending, setPending)
      .addCase(getCurrentUser.fulfilled, setFulfilled)
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.error = null;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });

    builder
      .addCase(refreshToken.pending, (state) => {
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, setFulfilled)
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      });

    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setError, updateUser, clearAuth, clearAuthError, setAuthState } =
  authSlice.actions;
export default authSlice.reducer;
