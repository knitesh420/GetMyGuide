// types/auth.ts
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string; // Changed from mobile to phone to match backend
  mobile?: string; // Keep for backward compatibility
  role: "admin" | "user" | "guide" | "manager" | "tourist";
  avatar?: string;
  isActive: boolean;
  status?: string;
  guideProfile?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuideProfile {
  _id: string;
  user: string;
  name: string;
  mobile: string;
  email: string;
  dob?: string;
  state?: string;
  country?: string;
  age?: number;
  languages?: string[];
  experience?: string;
  specializations?: string[];
  availability?: string[];
  hourlyRate?: number;
  description?: string;
  license?: string;
  photo?: string;
  isApproved: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean | null; // null = pending validation, true = authenticated, false = not authenticated
  loading: boolean;
  error: string | null;
}

export interface UserState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
  searchResults: SearchResults | null;
  isSearching: boolean;
  searchError: string | null;
}

export interface SearchResultItem {
  _id: string;
  title?: string;
  placeName?: string;
  description: string;
  image?: string;
  images?: string[];
  price?: number;
}

export interface SearchResults {
  packages: SearchResultItem[];
  locations: SearchResultItem[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: "user" | "guide";
  mobile?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user" | "guide" | "manager";
  mobile?: string;
  avatar?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  mobile?: string;
  password?: string;
  avatar?: string;
  // Fields below are admin-only (cannot be updated via /me endpoint)
  email?: string;
  role?: "admin" | "user" | "guide" | "manager";
  isActive?: boolean;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface OTPRequest {
  email: string;
}

export interface OtpLoginRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPRequest extends RegisterRequest {
  otp: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  total?: number;
  page?: number;
  totalPages?: number;
  count?: number;
}
