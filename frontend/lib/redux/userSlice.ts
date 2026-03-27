// lib/redux/userSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "../service/api";
import { User, UserState, CreateUserRequest, UpdateUserRequest, GetUsersParams, ApiResponse, SearchResults } from "@/types/auth";

// --- IMPORTANT: Import the actions from authSlice to listen to them ---
import { loginUser, getCurrentUser } from "./authSlice";

const initialState: UserState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, totalPages: 0 },
  searchResults: null,
  isSearching: false,
  searchError: null,
};

// Helper for error handling
const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// Helper for API response
const getApiData = <T>(result: any): T => result.data || result;

// --- Thunks (No changes needed here) ---

// Get own profile
export const getOwnProfile = createAsyncThunk<User, void>(
  "user/getOwnProfile",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiService.get("/users/me");
      if (!result.success) return rejectWithValue(result.message);
      return getApiData<User>(result);
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Update own profile
export const updateOwnProfile = createAsyncThunk<User, UpdateUserRequest>(
  "user/updateOwnProfile",
  async (data, { rejectWithValue }) => {
    try {
      const result = await apiService.put("/users/me", data);
      if (!result.success) return rejectWithValue(result.message);
      return getApiData<User>(result);
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Get all users (Admin only)
export const getAllUsers = createAsyncThunk<ApiResponse<User[]>, GetUsersParams | undefined>(
  "user/getAllUsers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const result = await apiService.get("/users", { params });
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Get user by ID (Admin only)
export const getUserById = createAsyncThunk<User, string>(
  "user/getUserById",
  async (userId, { rejectWithValue }) => {
    try {
      const result = await apiService.get(`/users/${userId}`);
      if (!result.success) return rejectWithValue(result.message);
      return getApiData<User>(result);
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Get users by role (Admin only)
export const getUsersByRole = createAsyncThunk<User[], string>(
  "user/getUsersByRole",
  async (role, { rejectWithValue }) => {
    try {
      const result = await apiService.get(`/users/role/${role}`);
      if (!result.success) return rejectWithValue(result.message);
      return getApiData<User[]>(result);
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Create user (Admin only)
export const createUser = createAsyncThunk<User, CreateUserRequest>(
  "user/createUser",
  async (userData, { rejectWithValue }) => {
    try {
      const result = await apiService.post("/users", userData);
      if (!result.success) return rejectWithValue(result.message);
      return getApiData<User>(result);
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Update user (Admin only)
export const updateUserById = createAsyncThunk<User, { userId: string; data: UpdateUserRequest }>(
  "user/updateUserById",
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const result = await apiService.put(`/users/${userId}`, data);
      if (!result.success) return rejectWithValue(result.message);
      return getApiData<User>(result);
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Delete user (Admin only)
export const deleteUser = createAsyncThunk<string, string>(
  "user/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      const result = await apiService.delete(`/users/${userId}`);
      if (!result.success) return rejectWithValue(result.message);
      return userId;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Search packages and locations
export const searchResources = createAsyncThunk<SearchResults, string>(
  "user/searchResources",
  async (query, { rejectWithValue }) => {
    try {
      const result = await apiService.get(`/users/search?query=${encodeURIComponent(query)}`);
      if (!result.success) return rejectWithValue(result.message);
      return result.data;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// --- Slice ---
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearUsers: (state) => {
      state.users = [];
      state.pagination = { total: 0, page: 1, totalPages: 0 };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
    clearSearch: (state) => {
      state.searchResults = null;
      state.isSearching = false;
      state.searchError = null;
    },
  },
  extraReducers: (builder) => {
    // Reusable handlers
    const setPending = (state: UserState) => {
      state.loading = true;
      state.error = null;
    };
    const setRejected = (state: UserState, action: any) => {
      state.loading = false;
      state.error = action.payload as string;
    };

    // --- THIS IS THE NEW, CORRECTED LOGIC ---
    // Listen for successful authentication from authSlice and update currentUser
    // builder
    //   .addCase(loginUser.fulfilled, (state, action) => {
    //     state.currentUser = action.payload.data || null;
    //   })
    //   .addCase(getCurrentUser.fulfilled, (state, action) => {
    //     state.currentUser = action.payload.data || null;
    //   });

    // --- YOUR EXISTING LOGIC REMAINS BELOW ---

    // Get Own Profile
    builder
      .addCase(getOwnProfile.pending, setPending)
      .addCase(getOwnProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(getOwnProfile.rejected, setRejected);

    // Update Own Profile
    builder
      .addCase(updateOwnProfile.pending, setPending)
      .addCase(updateOwnProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(updateOwnProfile.rejected, setRejected);

    // Get All Users
    builder
      .addCase(getAllUsers.pending, setPending)
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.data || [];
        state.pagination = {
          total: action.payload.total || 0,
          page: action.payload.page || 1,
          totalPages: action.payload.totalPages || 0,
        };
      })
      .addCase(getAllUsers.rejected, setRejected);

    // Get User By ID
    builder
      .addCase(getUserById.pending, setPending)
      .addCase(getUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(getUserById.rejected, setRejected);

    // Get Users By Role
    builder
      .addCase(getUsersByRole.pending, setPending)
      .addCase(getUsersByRole.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(getUsersByRole.rejected, setRejected);

    // Create User
    builder
      .addCase(createUser.pending, setPending)
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createUser.rejected, setRejected);

    // Update User
    builder
      .addCase(updateUserById.pending, setPending)
      .addCase(updateUserById.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) state.users[index] = action.payload;
        if (state.currentUser?.id === action.payload.id) {
          state.currentUser = action.payload;
        }
      })
      .addCase(updateUserById.rejected, setRejected);

    // Delete User
    builder
      .addCase(deleteUser.pending, setPending)
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter((u) => u.id !== action.payload);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
      })
      .addCase(deleteUser.rejected, setRejected);

    // Search Resources
    builder
      .addCase(searchResources.pending, (state) => {
        state.isSearching = true;
        state.searchError = null;
      })
      .addCase(searchResources.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchResources.rejected, (state, action) => {
        state.isSearching = false;
        state.searchError = action.payload as string;
      });
  },
});

export const { setError, clearUsers, clearError, clearCurrentUser, clearSearch } = userSlice.actions;
export default userSlice.reducer;