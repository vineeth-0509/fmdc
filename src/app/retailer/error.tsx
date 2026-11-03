"use client";

import { ErrorNote } from "@/components/ui";

export default function RetailerError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md pt-10">
      <ErrorNote message="We could not load this screen. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
