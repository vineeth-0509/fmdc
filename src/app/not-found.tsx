import Link from "next/link";
import { btnClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold">We could not find that page</h1>
      <p className="mt-2 text-sm text-ink-2">The link may be old, or the order may belong to another account.</p>
      <Link href="/" className={btnClass("primary", false, "mt-6")}>
        Go to start
      </Link>
    </main>
  );
}
