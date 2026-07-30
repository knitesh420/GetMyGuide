"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error to the console/monitoring in all environments so
    // client-side crashes are diagnosable in production.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          An unexpected error occurred. You can try again, or head back to the
          home page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
