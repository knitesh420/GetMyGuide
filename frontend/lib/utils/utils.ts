import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function debugPrint(...args: any[]) {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
}

export const getFormattedDay = (date: number) => {
  return date < 10 ? `0${date}` : date.toString();
};

export const getFormattedDateTimestamp = (date: Date = new Date()) => {
  const day = getFormattedDay(date.getDate());
  const month = getFormattedDay(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = getFormattedDay(date.getHours());
  const minutes = getFormattedDay(date.getMinutes());
  const seconds = getFormattedDay(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export function resolvePackageImageUrl(
  img?:
    | string
    | {
        url?: string;
        secure_url?: string;
        path?: string;
        publicId?: string;
      },
) {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  if (!img) return "/placeholder.svg";

  if (typeof img === "string") {
    const trimmed = img.trim();
    if (!trimmed) return "/placeholder.svg";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (trimmed.startsWith("/")) {
      return `${API_BASE_URL}${trimmed}`;
    }
    return `${API_BASE_URL}/media/packages/${trimmed}`;
  }

  const url = img.url || img.secure_url || img.path || img.publicId;
  if (!url || typeof url !== "string" || !url.trim()) {
    return "/placeholder.svg";
  }

  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }
  if (trimmedUrl.startsWith("/")) {
    return `${API_BASE_URL}${trimmedUrl}`;
  }
  return `${API_BASE_URL}/media/packages/${trimmedUrl}`;
}
