export default function Loading() {
  return (
    <main className="min-h-screen bg-marble-50 bg-marble-veins">
      <div className="mx-auto max-w-md px-5 pb-16 pt-8 sm:max-w-2xl">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-marble-200" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-marble-200" />
        <div className="mt-8 space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-marble-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-marble-200" />
        </div>
      </div>
    </main>
  );
}
