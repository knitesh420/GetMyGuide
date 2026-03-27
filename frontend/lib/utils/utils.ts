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
