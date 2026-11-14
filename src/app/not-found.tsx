import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-display text-7xl font-semibold text-fg-strong">404</p>
      <h1 className="mt-4 text-xl text-fg">Page not found</h1>
      <p className="mt-2 text-fg-muted">The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-accent px-5 py-2.5 font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
      >
        Back to home
      </Link>
    </main>
  );
}
