export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-48 rounded-lg bg-cream-3/60" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-cream-3 bg-cream" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-cream-3 bg-cream" />
    </div>
  );
}
