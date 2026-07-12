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
  // do not set a default Content-Type header here so FormData uploads
  // can be sent with the correct multipart boundary by the browser/axios
});

const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  // same: avoid forcing Content-Type so file uploads work correctly
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

/**
 * Rebuild the `{ success, message, data }` envelope every caller expects.
 *
 * The backend's Respond() helper does `res.json({ ...data, success: true })` —
 * it *spreads* its payload onto the response root rather than nesting it. A
 * controller that responds with a paginated result (`{ data, total, page }`)
 * therefore happens to leave a usable `data` key at the root, but one that
 * responds with a single document spreads that document's own fields instead
 * and leaves no `data` key at all.
 *
 * Since every thunk reads `response.data`, that second shape silently resolved
 * to `undefined`: approving a refund, recording a payout, hiding a review and
 * every other single-object mutation returned nothing and wrote `undefined`
 * into the store.
 *
 * Normalising here — the one point every request passes through — beats
 * patching ~40 call sites. The rebuild is deliberately *additive*: the original
 * root fields are spread back out, so anything already reading `response.total`
 * or `response.inquiries` keeps working, and `data` is merely filled in where
 * it was missing.
 */
function unwrap<T>(body: any): ApiResponse<T> {
  // A bare array or primitive body was never an envelope to begin with.
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { success: true, message: "", data: body as T };
  }

  // Already carries a payload key (the paginated case) — trust it as-is.
  if ("data" in body) return body as ApiResponse<T>;

  const { success, message, ...payload } = body;
  const keys = Object.keys(payload);

  const envelope = {
    ...body,
    success: success ?? true,
    message: message ?? "",
  };

  // Nothing but bookkeeping came back. This is the one shape we cannot read: an
  // empty array, an empty object and a message-only reply all spread to `{}`.
  // Leave `data` undefined rather than guess — callers already write
  // `response.data ?? []`, so undefined lands them on the right default.
  if (keys.length === 0) {
    return { ...envelope, data: undefined };
  }

  // Respond() spreads *arrays* as well: `{ ...[a, b] }` is `{ 0: a, 1: b }`, so a
  // controller answering with a list arrives as an object with numeric keys and
  // the array-ness lost. Rebuild it, or every caller that maps over the result
  // gets "x.map is not a function".
  const isSpreadArray = keys.every((key, index) => key === String(index));
  if (isSpreadArray) {
    return { ...envelope, data: keys.map((key) => payload[key]) as T };
  }

  // Otherwise the document's own fields are the payload.
  return { ...envelope, data: payload as T };
}

export const apiService = {
  get: <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.get(url, config).then((res) => unwrap<T>(res.data)),

  post: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.post(url, data, config).then((res) => unwrap<T>(res.data)),

  put: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.put(url, data, config).then((res) => unwrap<T>(res.data)),

  delete: <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.delete(url, config).then((res) => unwrap<T>(res.data)),

  patch: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data, config).then((res) => unwrap<T>(res.data)),
};

export const publicApiService = {
  get: <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.get(url, config).then((res) => unwrap<T>(res.data)),

  post: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.post(url, data, config).then((res) => unwrap<T>(res.data)),

  put: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.put(url, data, config).then((res) => unwrap<T>(res.data)),

  delete: <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.delete(url, config).then((res) => unwrap<T>(res.data)),

  patch: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> =>
    publicApiClient.patch(url, data, config).then((res) => unwrap<T>(res.data)),
};
