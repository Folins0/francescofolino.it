export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-marble-50">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-coral-200 border-t-coral-700"
        role="status"
        aria-label="Caricamento…"
      />
    </div>
  );
}
