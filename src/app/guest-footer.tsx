import Link from "next/link";

export function GuestFooter({
  maxWidthClassName = "max-w-[1104px]",
}: {
  maxWidthClassName?: string;
}) {
  return (
    <footer
      className={`mx-auto flex ${maxWidthClassName} gap-5 px-6 py-7 text-[12px] text-guest-muted`}
    >
      <Link href="/" className="font-semibold text-guest-ink">
        WnJ
      </Link>
      <Link href="/rooms" className="text-guest-muted">
        Rooms
      </Link>
      <Link href="/about" className="text-guest-muted">
        About
      </Link>
    </footer>
  );
}
