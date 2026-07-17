export default function Loading() {
  return (
    <div className="min-h-screen bg-marble-50">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
        <div className="h-6 w-40 animate-pulse rounded bg-marble-200" />
      </div>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="h-24 animate-pulse rounded-2xl bg-marble-200" />
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-marble-200" />
      </main>
    </div>
  );
}
