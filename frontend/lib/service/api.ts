// lib/service/api.ts
import axios, { AxiosRequestConfig, AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  count?: number;
  page?: number;
  total?: number;
  totalPages?: number;
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json", // Default JSON
  },
});

const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
//
// Auth is carried via HTTP-only cookies (`auth-cookie` / `refresh-cookie`)
// set by the backend. We deliberately do NOT read a token from localStorage
// or attach a global Authorization header — doing so creates shared/global
// auth state that can leak between users (e.g. SSR rendering with the wrong
// caller's token, or one tab affecting another via storage events).
apiClient.interceptors.request.use(
  (config) => {
    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error),
);

// Single-flight refresh: if multiple requests 401 concurrently, only one
// /session/refresh call is made; the rest await its result.
let refreshInFlight: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = apiClient
      .post("/session/refresh")
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const errorData = error.response.data as ApiResponse;
      const original = error.config as
        | (AxiosRequestConfig & { _retried?: boolean })
        | undefined;

      // Try a one-shot refresh on 401 (except for the refresh / login routes
      // themselves to avoid loops).
      if (
        error.response.status === 401 &&
        original &&
        !original._retried &&
        !original.url?.includes("/session/refresh") &&
        !original.url?.includes("/session/login")
      ) {
        original._retried = true;
        const ok = await attemptRefresh();
        if (ok) {
          return apiClient.request(original);
        }
      }

      return Promise.reject(
        errorData || { success: false, message: "Server error" },
      );
    } else if (error.request) {
      return Promise.reject({
        success: false,
        message: "No response from server",
      });
    } else {
      return Promise.reject({
        success: false,
        message: error.message || "Request failed",
      });
    }
  },
);

export const apiService = {
  get: <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.get(url, config).then((res) => res.data),

  post: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.post(url, data, config).then((res) => res.data),

  put: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.put(url, data, config).then((res) => res.data),

  delete: <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.delete(url, config).then((res) => res.data),

  patch: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data, config).then((res) => res.data),
};

export const publicApiService = {
  get: <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.get(url, config).then((res) => res.data),

  post: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.post(url, data, config).then((res) => res.data),

  put: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.put(url, data, config).then((res) => res.data),

  delete: <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.delete(url, config).then((res) => res.data),

  patch: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.patch(url, data, config).then((res) => res.data),
};
