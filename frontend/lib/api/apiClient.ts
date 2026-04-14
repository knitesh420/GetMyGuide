import RequestError from "./RequestError";
import { debugPrint, getFormattedDateTimestamp } from "../utils";

interface RequestOptions extends RequestInit {
  tags?: string[];
  userId?: string;
  /** Force a per-user cached fetch. Defaults to false (no shared cache). */
  cache?: RequestCache;
}

const SERVER_URL = process.env.NEXT_PUBLIC_API_URL;
if (!SERVER_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

const isServer = typeof window === "undefined";

/**
 * Endpoints whose response depends on the caller's identity. These MUST never
 * hit Next.js's server-side data cache, which is keyed by URL and shared
 * across all visitors. Caching them is what causes the "log in as admin and
 * everyone else sees the admin" bug.
 */
const PER_USER_PATH_PREFIXES = [
  "/session",
  "/sessions",
  "/auth",
  "/user",
  "/users",
  "/me",
  "/admin",
  "/booking",
  "/bookings",
  "/cart",
  "/payment",
  "/payments",
  "/dashboard",
];

function isPerUserPath(path: string): boolean {
  return PER_USER_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

interface RequestContext {
  cookiesString: string | null;
  userId: string | undefined;
  refreshToken: string | undefined;
}

async function buildRequestContext(): Promise<RequestContext> {
  if (!isServer) {
    return { cookiesString: null, userId: undefined, refreshToken: undefined };
  }
  const { cookies } = await import("next/headers");
  const cookieStore = cookies();
  const cookiesString = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  return {
    cookiesString,
    userId: cookieStore.get("user-id")?.value,
    refreshToken: cookieStore.get("refresh-cookie")?.value,
  };
}

async function rawRequest(
  path: string,
  options: RequestOptions
): Promise<Response> {
  const { cookiesString } = await buildRequestContext();

  return fetch(`${SERVER_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
      ...(isServer && cookiesString && { Cookie: cookiesString }),
    },
  });
}

/**
 * Mutating / non-cacheable request. Bypasses the Next.js data cache entirely.
 */
async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const { cookiesString, userId } = await buildRequestContext();

  const response = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
      ...(isServer && cookiesString && { Cookie: cookiesString }),
    },
  });

  if (!["/auth/details"].includes(path)) {
    debugPrint(
      `API - [${path}] - ${getFormattedDateTimestamp()} - ${
        userId || "unknown"
      } - CACHE : ${response.headers.get("X-Cache-Status") ?? "MISS"}`
    );
  }

  if (response.ok) {
    return response.json();
  }
  throw await RequestError.fromResponse(response);
}

/**
 * GET request. For per-user paths, ALWAYS bypasses the Next.js shared data
 * cache; for genuinely public paths, allows revalidation but scopes any tags
 * with the caller's session id so invalidation is correct.
 */
async function cachedRequest<T>(
  path: string,
  options: RequestOptions
): Promise<T> {
  const { cookiesString, userId, refreshToken } = await buildRequestContext();

  const perUser = isPerUserPath(path);

  const fetchInit: RequestInit & { next?: any } = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
      ...(isServer && cookiesString && { Cookie: cookiesString }),
    },
  };

  if (perUser) {
    // Per-user data MUST NOT be cached server-side. The Next.js data cache is
    // shared across visitors; caching even one authenticated response leaks it
    // to every subsequent caller.
    fetchInit.cache = "no-store";
  } else {
    fetchInit.next = {
      revalidate: 3600,
      ...options.next,
      // Scope tags by the caller so revalidations are user-specific.
      tags: options.tags?.map((tag) => `${tag}-${refreshToken ?? "anon"}`),
    };
  }

  const response = await fetch(`${SERVER_URL}${path}`, fetchInit);

  if (!["/sessions/validate-auth", "/sessions/details"].includes(path)) {
    debugPrint(
      `API - [${path}] - ${getFormattedDateTimestamp()} - ${
        userId || "unknown"
      } - CACHE : ${response.headers.get("X-Cache-Status") ?? (perUser ? "BYPASS" : "HIT")}`
    );
  }

  if (response.ok) {
    return response.json();
  }
  throw await RequestError.fromResponse(response);
}

function getMethod<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return cachedRequest(path, { ...options, method: "GET" });
}

function postMethod<T>(
  path: string,
  body?: object,
  options: RequestOptions = {}
): Promise<T> {
  return request(path, {
    ...options,
    method: "POST",
    ...(body && { body: JSON.stringify(body) }),
  });
}

function patchMethod<T>(
  path: string,
  body?: object,
  options: RequestOptions = {}
): Promise<T> {
  return request(path, {
    ...options,
    method: "PATCH",
    ...(body && { body: JSON.stringify(body) }),
  });
}

function deleteMethod<T>(
  path: string,
  body?: object,
  options: RequestOptions = {}
): Promise<T> {
  return request(path, {
    ...options,
    method: "DELETE",
    ...(body && { body: JSON.stringify(body) }),
  });
}

function putMethod<T>(
  path: string,
  body?: object,
  options: RequestOptions = {}
): Promise<T> {
  return request(path, {
    ...options,
    method: "PUT",
    ...(body && { body: JSON.stringify(body) }),
  });
}

function getWithoutCacheMethod<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  return cachedRequest(path, {
    ...options,
    cache: "no-store",
    next: { revalidate: 0 },
    headers: { "Cache-Control": "no-cache" },
  });
}

function headMethod<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return cachedRequest(path, { ...options, method: "HEAD" });
}

async function revalidateTag(tag: string): Promise<void> {
  if (isServer) {
    const { revalidateTag: revalidateTagFn } = await import("next/cache");
    revalidateTagFn(tag);
  }
}

export const apiClient = {
  get: getMethod,
  getWithoutCache: getWithoutCacheMethod,
  head: headMethod,
  post: postMethod,
  patch: patchMethod,
  put: putMethod,
  delete: deleteMethod,
  revalidateTag,
  rawRequest,
};
