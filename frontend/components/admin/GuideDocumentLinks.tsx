"use client";

import { Download, ExternalLink, FileWarning } from "lucide-react";
import { GuideDocument } from "@/lib/data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * A guide's KYC documents (driving licence, Aadhaar), as links an admin can
 * actually open.
 *
 * The bug this replaces: `Guide.identityProofs` holds bare filenames, and the
 * admin panel used them straight as an href. A filename resolves against the
 * *frontend* origin, so every document 404'd. The backend now hands back
 * `documents[]`, whose `url` points at an admin-only route on the API that
 * streams the file (or redirects to Cloudinary for newer uploads).
 *
 * The links carry the admin's session cookie because they are top-level
 * navigations to the API origin — which is why these are plain anchors and not
 * fetches: an <a> lets the browser render the PDF, and lets `?download=1` become
 * a real save dialog.
 */
export function GuideDocumentLinks({ documents }: { documents: GuideDocument[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-amber-700">No documents uploaded.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {documents.map((doc) => (
        <li key={doc.index}>
          {doc.available ? (
            <span className="inline-flex items-stretch overflow-hidden rounded-lg border">
              <a
                href={`${API_BASE}${doc.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-teal-700 transition-colors hover:bg-teal-50"
              >
                {doc.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={`${API_BASE}${doc.downloadUrl}`}
                // No target="_blank": the response is an attachment, so the tab it
                // would open is a blank one the admin then has to close.
                className="inline-flex items-center border-l px-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                aria-label={`Download ${doc.label}`}
                title={`Download ${doc.label}`}
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </span>
          ) : (
            // The row points at a file the API server no longer holds — almost
            // always a pre-Cloudinary upload lost to a redeploy. Say so, rather
            // than offering a link that 404s.
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800"
              title="The file is no longer on the server. Ask the guide to re-upload it."
            >
              <FileWarning className="h-3.5 w-3.5" />
              {doc.label} — file missing
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default GuideDocumentLinks;
