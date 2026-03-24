"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-xl font-semibold text-slate-800">Something went wrong</h1>
            <p className="text-sm text-slate-500">
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
