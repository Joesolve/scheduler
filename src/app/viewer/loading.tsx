export default function ViewerLoading() {
  return (
    <div className="p-8 space-y-4 animate-pulse">
      {/* Page header skeleton */}
      <div className="h-8 bg-slate-200 rounded-lg w-48" />
      <div className="h-4 bg-slate-100 rounded w-72" />
      <div className="border-b border-slate-200 pt-2" />

      {/* Content skeleton */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-slate-100 rounded-xl" />
    </div>
  );
}
