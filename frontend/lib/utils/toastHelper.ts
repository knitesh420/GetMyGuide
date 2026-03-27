import { toast } from "react-toastify";

export const showToast = {
  success: (message: string, label?: string) =>
    toast.success(message, { ariaLabel: label ?? "Success message" }),
  error: (message: string, label?: string) =>
    toast.error(message, { ariaLabel: label ?? "Error message" }),
  info: (message: string, label?: string) =>
    toast.info(message, { ariaLabel: label ?? "Info message" }),
};
