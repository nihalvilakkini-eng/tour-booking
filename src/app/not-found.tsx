import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <h2 className="text-2xl font-semibold text-slate-700">Page not found</h2>
      <p className="max-w-md text-slate-600">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Go home
      </Link>
    </main>
  );
}
