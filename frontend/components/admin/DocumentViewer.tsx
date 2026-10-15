"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, FileText, LoaderCircle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GuideIdentityDocumentInfo } from "@/lib/data";
import { apiService } from "@/lib/service/api";

interface DocumentViewerProps {
  label: string;
  document: GuideIdentityDocumentInfo | null;
}

interface LoadedDocument {
  url: string;
  mimeType: string;
}

export function DocumentViewer({ label, document }: DocumentViewerProps) {
  const [loadedDocument, setLoadedDocument] = useState<LoadedDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (loadedDocument) URL.revokeObjectURL(loadedDocument.url);
    };
  }, [loadedDocument]);

  const loadDocument = async () => {
    if (!document) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const blob = await apiService.getBlob(document.url, { signal: controller.signal });
      setLoadedDocument({
        url: URL.createObjectURL(blob),
        mimeType: blob.type || document.mimeType || "application/octet-stream",
      });
    } catch (loadError) {
      if (!controller.signal.aborted) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : `Could not load ${label}. The document may be missing or your admin session may have expired. Check your access and retry.`,
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const removePreview = () => setLoadedDocument(null);
  const isImage = loadedDocument?.mimeType.startsWith("image/");
  const isPdf = loadedDocument?.mimeType === "application/pdf";
  const extension = isPdf
    ? "pdf"
    : loadedDocument?.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const downloadName = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${extension}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500" />
          <h3 className="truncate text-sm font-semibold text-slate-900">{label}</h3>
        </div>
        {document ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={loadedDocument ? removePreview : loadDocument}
          >
            {loading ? (
              <LoaderCircle aria-hidden="true" className="mr-1.5 h-4 w-4 animate-spin" />
            ) : loadedDocument ? (
              "Close preview"
            ) : (
              "View document"
            )}
          </Button>
        ) : (
          <span className="text-xs text-slate-500">Not uploaded</span>
        )}
      </div>

      {loading && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          Loading {label}…
        </p>
      )}
      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={loadDocument}>
            <RotateCw aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {loadedDocument && (
        <div className="mt-4 space-y-3">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {isImage ? (
              <div className="relative mx-auto min-h-48 max-h-[32rem] w-full">
                <Image
                  src={loadedDocument.url}
                  alt={`${label} preview`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized
                  className="object-contain"
                />
              </div>
            ) : isPdf ? (
              <iframe
                title={`${label} PDF preview`}
                src={loadedDocument.url}
                className="h-[32rem] w-full"
              />
            ) : (
              <p className="p-4 text-sm text-slate-600">
                Preview is unavailable for this file type. Download it to view.
              </p>
            )}
          </div>
          <a
            href={loadedDocument.url}
            download={downloadName}
            className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <Download aria-hidden="true" className="mr-2 h-4 w-4" />
            Download
          </a>
        </div>
      )}
    </section>
  );
}

export default DocumentViewer;
