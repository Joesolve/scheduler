"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-semibold text-slate-800">Page Error</h2>
        <p className="text-sm text-slate-500">
          {error.message || "An unexpected error occurred on this page."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button onClick={reset}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}
