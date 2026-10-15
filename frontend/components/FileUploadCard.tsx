"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, FileText, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_BYTES, formatBytes, validateUpload } from "@/lib/fileUpload";

type UploadKind = "image" | "document";

interface FileUploadCardProps {
  label: string;
  kind: UploadKind;
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  disabled?: boolean;
  existingPreviewUrl?: string;
  existingFileName?: string | null;
  existingFileSize?: number | null;
  onRemoveExisting?: () => void;
  captureSelfie?: boolean;
}

export function FileUploadCard({
  label,
  kind,
  value,
  onChange,
  required = false,
  disabled = false,
  existingPreviewUrl,
  existingFileName,
  existingFileSize,
  onRemoveExisting,
  captureSelfie = false,
}: FileUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const isImage = kind === "image";
  const hasExistingFile = !!existingPreviewUrl || !!existingFileName;

  useEffect(() => {
    if (!value && previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, [value]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const selectFile = (file?: File) => {
    if (!file) return;
    const error = validateUpload(file, kind);
    if (error) {
      setValidationError(error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setValidationError("");
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;
    setPreviewUrl(previewUrlRef.current);
    onChange(file);
  };

  const removeFile = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    if (value) onChange(null);
    else onRemoveExisting?.();
    setValidationError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const accept = isImage ? "image/*" : ".jpg,.jpeg,.png,.pdf";
  const typeSummary = isImage ? "JPG, PNG or WEBP" : "JPG, PNG or PDF";
  const errorId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-upload-error`;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (!disabled) selectFile(event.dataTransfer.files?.[0]);
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium">
          {value || hasExistingFile ? (
            <>
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-green-600" />
              <span className="text-green-700">Selected</span>
            </>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-inset ring-amber-200">
              {required ? "Required" : "Optional"}
            </span>
          )}
          {required && (value || hasExistingFile) && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-inset ring-amber-200">
              Required
            </span>
          )}
        </span>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        {typeSummary} · max {formatBytes(MAX_UPLOAD_BYTES)}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={captureSelfie ? "user" : undefined}
        aria-label={`Choose ${label}`}
        aria-describedby={validationError ? errorId : undefined}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          selectFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      {value ? (
        <div className="mb-3 flex min-w-0 items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          {isImage && previewUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-white">
              <Image src={previewUrl} alt={`${label} preview`} fill sizes="64px" unoptimized className="object-cover" />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-slate-200">
              <FileText aria-hidden="true" className="h-7 w-7 text-slate-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{value.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(value.size)}</p>
          </div>
        </div>
      ) : hasExistingFile ? (
        <div className="mb-3 flex min-w-0 items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          {isImage && existingPreviewUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-white">
              <Image src={existingPreviewUrl} alt={`${label} preview`} fill sizes="64px" unoptimized className="object-cover" />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-slate-200">
              <FileText aria-hidden="true" className="h-7 w-7 text-slate-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {existingFileName || "Uploaded file"}
            </p>
            {existingFileSize != null && (
              <p className="text-xs text-slate-500">{formatBytes(existingFileSize)}</p>
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={`Upload ${label}. Drag a file here or tap to browse`}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm text-slate-600 transition-colors hover:border-teal-500 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload aria-hidden="true" className="h-5 w-5 text-slate-500" />
        <span>Drag a file here or tap to browse</span>
      </button>

      {(value || hasExistingFile) && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            aria-label={`Replace ${label}`}
          >
            Replace
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={removeFile}
            aria-label={`Remove ${label}`}
          >
            <X aria-hidden="true" className="mr-1 h-4 w-4" />
            Remove
          </Button>
        </div>
      )}

      {validationError && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">
          {validationError}
        </p>
      )}
    </section>
  );
}

export default FileUploadCard;
