"use client";

/**
 * App-wide dialog helpers built on SweetAlert2, replacing native
 * `alert()` / `window.confirm()`. Everything is funnelled through this module
 * so success / error / warning / confirmation dialogs look and behave the same
 * everywhere and stay on-brand (primary red #dc2626).
 *
 * SweetAlert2 is imported lazily inside each call rather than at module scope:
 * these helpers live in client components that Next.js still server-renders for
 * the initial HTML, and a top-level import would run the library's DOM code on
 * the server. The dynamic import only resolves in the browser, when a dialog is
 * actually opened, and is cached after the first call.
 *
 * A few visual tweaks (rounded popup, brand buttons) live in `globals.css`
 * under the `.swal-app-*` selectors.
 */
import type { SweetAlertIcon, SweetAlertResult } from "sweetalert2";

const BRAND = "#dc2626"; // primary red — matches --primary / themeColor
const NEUTRAL = "#e2e8f0"; // slate-200, for the passive cancel button

/** Shared look for every dialog this app opens. */
const baseCustomClass = {
  popup: "swal-app-popup",
  title: "swal-app-title",
  htmlContainer: "swal-app-text",
  confirmButton: "swal-app-confirm",
  cancelButton: "swal-app-cancel",
  actions: "swal-app-actions",
} as const;

async function getSwal() {
  const mod = await import("sweetalert2");
  return mod.default;
}

/** Success feedback — an unobtrusive auto-dismissing modal. */
export async function showSuccess(title: string, text?: string): Promise<SweetAlertResult> {
  const Swal = await getSwal();
  return Swal.fire({
    icon: "success",
    title,
    text,
    timer: 2200,
    timerProgressBar: true,
    showConfirmButton: false,
    buttonsStyling: true,
    confirmButtonColor: BRAND,
    customClass: baseCustomClass,
  });
}

/** Error feedback — stays open until dismissed. */
export async function showError(title: string, text?: string): Promise<SweetAlertResult> {
  const Swal = await getSwal();
  return Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonText: "OK",
    buttonsStyling: true,
    confirmButtonColor: BRAND,
    customClass: baseCustomClass,
  });
}

/** Warning / informational notice that requires acknowledgement. */
export async function showWarning(title: string, text?: string): Promise<SweetAlertResult> {
  const Swal = await getSwal();
  return Swal.fire({
    icon: "warning",
    title,
    text,
    confirmButtonText: "OK",
    buttonsStyling: true,
    confirmButtonColor: BRAND,
    customClass: baseCustomClass,
  });
}

/** Neutral informational notice. */
export async function showInfo(title: string, text?: string): Promise<SweetAlertResult> {
  const Swal = await getSwal();
  return Swal.fire({
    icon: "info",
    title,
    text,
    confirmButtonText: "OK",
    buttonsStyling: true,
    confirmButtonColor: BRAND,
    customClass: baseCustomClass,
  });
}

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  /** Use a red confirm button + focus the cancel button for destructive actions. */
  destructive?: boolean;
  icon?: Extract<SweetAlertIcon, "warning" | "question" | "info" | "error">;
}

/**
 * Ask the user to confirm an action. Resolves to `true` when they confirm,
 * `false` otherwise. Drop-in, awaitable replacement for `window.confirm()`.
 */
export async function confirmDialog({
  title,
  text,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  icon = "warning",
}: ConfirmOptions): Promise<boolean> {
  const Swal = await getSwal();
  const result = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    buttonsStyling: true,
    confirmButtonColor: BRAND,
    cancelButtonColor: NEUTRAL,
    focusCancel: destructive,
    customClass: baseCustomClass,
  });
  return result.isConfirmed;
}
