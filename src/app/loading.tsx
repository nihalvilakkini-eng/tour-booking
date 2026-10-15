export default function Loading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-slate-600" aria-live="polite">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <span>Loading...</span>
      </div>
    </main>
  );
}
