import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-6xl font-display text-brand-orange">404</div>
        <h1 className="text-xl font-semibold text-slate-800">Page not found</h1>
        <p className="text-sm text-slate-500">
          The page you're looking for doesn't exist or you don't have access.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
