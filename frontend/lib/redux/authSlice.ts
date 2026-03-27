// lib/redux/authSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "../service/api";
import {
  AuthState,
  LoginRequest,
  OTPRequest,
  User,
  AuthResponse,
} from "@/types/auth";

// Initialize state from localStorage if available
const getInitialState = (): AuthState => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("authUser");
    if (token) {
      // Token exists — set isAuthenticated to null (pending validation)
      // Protected pages should wait for validation before redirecting
      return {
        user: user ? JSON.parse(user) : null,
        token,
        isAuthenticated: null,
        loading: false,
        error: null,
      };
    }
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };
};

const initialState: AuthState = getInitialState();

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// Login
export const loginUser = createAsyncThunk<AuthResponse, LoginRequest>(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/api/session/login", credentials);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Register/Signup user directly (backend doesn't use OTP)
export const registerUser = createAsyncThunk<AuthResponse, any>(
  "auth/registerUser",
  async (data, { rejectWithValue }) => {
    try {
      // Transform data to match backend expectations
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.mobile || data.phone, // Backend uses 'phone', frontend uses 'mobile'
        password: data.password,
        role: data.role || data.userType || "tourist",
      };
      const result = await apiService.post("/api/session/signup", payload);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Keep sendOTP for backward compatibility (not used by backend)
export const sendOTP = createAsyncThunk<AuthResponse, OTPRequest>(
  "auth/sendOTP",
  async (data, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/api/auth/send-otp", data);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Verify OTP and Register (simplified to direct signup)
export const verifyOtpAndRegister = createAsyncThunk<AuthResponse, FormData>(
  "auth/verifyOtpAndRegister",
  async (formData, { rejectWithValue }) => {
    try {
      // Extract form data and send as JSON
      const payload = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("mobile") as string,
        password: formData.get("password") as string,
        role: (formData.get("role") as string) || "tourist",
      };
      const result = await apiService.post("/api/session/signup", payload);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Get current user - Updated with better error handling
export const getCurrentUser = createAsyncThunk<AuthResponse>(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiService.get("/api/session/validate-auth");
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// Refresh token (backend may not have this endpoint, keeping for compatibility)
export const refreshToken = createAsyncThunk<AuthResponse>(
  "auth/refreshToken",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/api/session/refresh");
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
      await apiService.post("/api/session/logout");
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// --- Slice ---
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

      // Clear token from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
      }
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    // New reducer for setting auth state from external sources
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

    // Login
    builder
      .addCase(loginUser.pending, setPending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        // Backend returns { data: { token, user } }
        const responseData = action.payload.user;
        const userData = responseData;
        if (userData && userData.phone) {
          // Map phone to mobile for backward compatibility
          userData.mobile = userData.phone;
        }
        const token = action.payload.token;
        localStorage.setItem("authToken", token);

        state.user = userData;
        state.token = token;
        state.isAuthenticated = true;
        state.error = null;

        // Store token in localStorage for persistence
        if (token && typeof window !== "undefined") {
          localStorage.setItem("authToken", token);
          localStorage.setItem("authUser", JSON.stringify(userData));
        }
      })
      .addCase(loginUser.rejected, setRejected);

    // Register User
    builder
      .addCase(registerUser.pending, setPending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        // Backend returns { data: { token, user } }
        const responseData = action.payload.data as any;
        const userData = responseData?.user || responseData || null;
        if (userData && userData.phone) {
          // Map phone to mobile for backward compatibility
          userData.mobile = userData.phone;
        }
        const token = responseData?.token || null;
        state.user = userData;
        state.token = token;
        state.isAuthenticated = true;
        state.error = null;

        // Store token in localStorage for persistence
        if (token && typeof window !== "undefined") {
          localStorage.setItem("authToken", token);
        }
      })
      .addCase(registerUser.rejected, setRejected);

    // Send OTP (not used by backend, kept for compatibility)
    builder
      .addCase(sendOTP.pending, setPending)
      .addCase(sendOTP.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(sendOTP.rejected, setRejected);

    // Verify OTP and Register (direct signup)
    builder
      .addCase(verifyOtpAndRegister.pending, setPending)
      .addCase(verifyOtpAndRegister.fulfilled, (state, action) => {
        state.loading = false;
        const responseData = action.payload.data as any;
        const userData = responseData?.user || null;
        if (userData && userData.phone) {
          // Map phone to mobile for backward compatibility
          userData.mobile = userData.phone;
        }
        const token = responseData?.token || null;
        state.user = userData;
        state.token = token;
        state.isAuthenticated = true;
        state.error = null;

        // Store token in localStorage for persistence
        if (token && typeof window !== "undefined") {
          localStorage.setItem("authToken", token);
        }
      })
      .addCase(verifyOtpAndRegister.rejected, setRejected);

    // Get Current User
    builder
      .addCase(getCurrentUser.pending, setPending)
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        // Backend returns { data: { user } }
        const responseData = action.payload.user as any;
        const userData = responseData || null;
        if (userData && userData.phone) {
          // Map phone to mobile for backward compatibility
          userData.mobile = userData.phone;
        }
        state.user = userData;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.error = null;
        // Validation failed — clear auth state so protected pages redirect
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
        }
      });

    // Refresh Token
    builder
      .addCase(refreshToken.pending, (state) => {
        // Don't set loading for silent refresh
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        const responseData = action.payload.data as any;
        const userData = responseData || null;
        if (userData && userData.phone) {
          // Map phone to mobile for backward compatibility
          userData.mobile = userData.phone;
        }
        state.user = userData;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      });

    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;

        // Clear token from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
        }
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // Still clear auth state even if logout failed
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;

        // Clear token from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
        }
      });
  },
});

export const { setError, updateUser, clearAuth, clearAuthError, setAuthState } =
  authSlice.actions;
export default authSlice.reducer;
