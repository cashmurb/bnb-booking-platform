import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f6f8] px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-normal text-guest-ink">
          That link didn&apos;t work
        </h1>
        <p className="mt-2 text-sm text-guest-muted">
          {error ?? "The link may have expired, or already been used."}
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-md bg-guest-navy px-4 py-2 text-sm font-medium text-white hover:bg-guest-navy-dark"
        >
          Request a new link
        </Link>
      </div>
    </main>
  );
}
