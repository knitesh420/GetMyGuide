/**
 * Client-side helpers for the guide profile uploads: validation and automatic
 * image compression before a file leaves the browser. Purely additive — the
 * backend re-validates type and size, so these only make the UX nicer (fail
 * fast, and keep large phone photos from being rejected for size).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB — matches the backend multer limit.

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const DOCUMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

/** Human-readable file size, e.g. "2.4 MB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Returns an error message if the file is the wrong type/size, else null. */
export function validateUpload(
  file: File,
  kind: "image" | "document",
): string | null {
  const allowed = kind === "image" ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES;
  if (!allowed.includes(file.type)) {
    return kind === "image"
      ? "Please upload a JPG, PNG or WebP image."
      : "Please upload a PDF, JPG, PNG or WebP file.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (max ${formatBytes(MAX_UPLOAD_BYTES)}).`;
  }
  return null;
}

/**
 * Downscale + re-encode a large image so uploads stay small and fast. Leaves
 * small images, WebP and non-images (PDFs) untouched. Best-effort: any failure
 * falls back to the original file, so this can never block an upload.
 */
export async function compressImage(
  file: File,
  { maxDimension = 1600, quality = 0.82, minBytesToCompress = 1.2 * 1024 * 1024 } = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/webp") return file;
  if (file.size < minBytesToCompress) return file;
  if (typeof document === "undefined") return file;

  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);

    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    // Nothing to gain from upscaling — only compress when we can shrink.
    if (scale >= 1 && file.size < 3 * 1024 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
